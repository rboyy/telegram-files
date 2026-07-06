package telegram.files;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.log.Log;
import cn.hutool.log.LogFactory;
import io.vertx.core.AbstractVerticle;
import io.vertx.core.Future;
import io.vertx.core.Promise;
import io.vertx.core.json.JsonObject;
import org.jooq.lambda.tuple.Tuple3;
import telegram.files.repository.FileRecord;
import telegram.files.repository.SettingAutoRecords;

import java.util.List;
import java.util.Map;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

public class TransferVerticle extends AbstractVerticle {
    private static final Log log = LogFactory.get();

    private static final int HISTORY_SCAN_INTERVAL = 2 * 60 * 1000;

    /**
     * Number of concurrent file transfers allowed.
     * Multiple workers process the transfer queue in parallel to maximize throughput.
     */
    private static final int TRANSFER_CONCURRENCY = 3;

    private final SettingAutoRecords autoRecords;

    private final Map<String, Transfer> transfers = new ConcurrentHashMap<>();

    private final BlockingQueue<WaitingTransferFile> waitingTransferFiles = new LinkedBlockingQueue<>();

    /**
     * O(1) dedup set to avoid scanning the queue with contains() which is O(n).
     */
    private final ConcurrentHashMap<String, Boolean> waitingTransferFileIds = new ConcurrentHashMap<>();

    private volatile boolean isStopped = false;

    private final AtomicInteger activeTransfers = new AtomicInteger(0);

    private final List<Thread> workerThreads = new CopyOnWriteArrayList<>();

    public TransferVerticle() {
        this.autoRecords = AutomationsHolder.INSTANCE.autoRecords();
        AutomationsHolder.INSTANCE.registerOnRemoveListener(removedItems -> removedItems.forEach(item -> {
            waitingTransferFiles.removeIf(waitingTransferFile -> waitingTransferFile.uniqueId().equals(item.uniqueKey()));
            waitingTransferFileIds.remove(item.uniqueKey());
            transfers.remove(item.uniqueKey());
        }));
    }

    @Override
    public void start(Promise<Void> startPromise) {
        initEventConsumer().onSuccess(_ -> {
            vertx.setPeriodic(0, HISTORY_SCAN_INTERVAL, _ -> addHistoryFiles());

            // Start worker threads that consume from the transfer queue.
            // Each worker blocks on queue.take() until a file is available,
            // then processes it immediately — no polling delay.
            for (int i = 0; i < TRANSFER_CONCURRENCY; i++) {
                Thread t = Thread.ofVirtual()
                        .name("transfer-worker-" + i)
                        .start(this::transferWorkerLoop);
                workerThreads.add(t);
            }

            log.info("""
                    Transfer verticle started!
                    |History scan interval: %s ms
                    |Transfer concurrency: %d
                    |Auto chats: %s
                    """.formatted(HISTORY_SCAN_INTERVAL, TRANSFER_CONCURRENCY, autoRecords.getTransferEnabledItems().size()));

            startPromise.complete();
        }).onFailure(startPromise::fail);
    }

    @Override
    public void stop(Promise<Void> stopPromise) {
        isStopped = true;
        // Interrupt workers so they exit the blocking queue.take()
        workerThreads.forEach(Thread::interrupt);

        int active = activeTransfers.get();
        if (active > 0) {
            log.info("Waiting for %d active transfer(s) to complete...".formatted(active));
            // Poll until all active transfers finish, with a 30-second timeout
            long deadline = System.currentTimeMillis() + 30_000;
            while (activeTransfers.get() > 0 && System.currentTimeMillis() < deadline) {
                try {
                    Thread.sleep(200);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            int remaining = activeTransfers.get();
            if (remaining > 0) {
                log.warn("Timed out waiting for %d active transfer(s), forcing stop".formatted(remaining));
            }
        }
        log.info("Transfer verticle stopped");
        stopPromise.complete();
    }

    /**
     * Worker loop: blocks on queue.take() and processes transfers immediately.
     * Runs on virtual threads — blocking I/O and Future.await are safe.
     */
    private void transferWorkerLoop() {
        while (!isStopped) {
            try {
                WaitingTransferFile waitingFile = waitingTransferFiles.take();
                if (isStopped) break;
                processTransfer(waitingFile);
            } catch (InterruptedException e) {
                if (isStopped) break;
                Thread.currentThread().interrupt();
                log.debug("Transfer worker interrupted");
                break;
            } catch (Exception e) {
                log.error(e, "Transfer worker error");
            }
        }
    }

    private void processTransfer(WaitingTransferFile waitingFile) {
        try {
            Transfer transfer = transfers.get("%d:%d".formatted(waitingFile.telegramId(), waitingFile.chatId()));
            if (transfer == null) {
                log.warn("Transfer not found for %d:%d".formatted(waitingFile.telegramId(), waitingFile.chatId()));
                return;
            }

            FileRecord fileRecord = Future.await(DataVerticle.fileRepository.getByUniqueId(waitingFile.uniqueId()));
            if (fileRecord == null) {
                log.error("File not found: %s".formatted(waitingFile.uniqueId()));
                return;
            }

            if (!fileRecord.isDownloadStatus(FileRecord.DownloadStatus.completed)
                || StrUtil.isBlank(fileRecord.localPath())) {
                log.warn("File {} is not downloaded yet", fileRecord.id());
                return;
            }
            if (fileRecord.transferStatus() != null
                && !fileRecord.isTransferStatus(FileRecord.TransferStatus.idle)) {
                log.debug("File {} transfer status is not idle: {}", fileRecord.id(), fileRecord.transferStatus());
                return;
            }

            activeTransfers.incrementAndGet();
            try {
                transfer.transfer(fileRecord);
            } finally {
                activeTransfers.decrementAndGet();
            }
        } finally {
            waitingTransferFileIds.remove(waitingFile.uniqueId());
        }
    }

    private Future<Void> initEventConsumer() {
        vertx.eventBus().consumer(EventEnum.TELEGRAM_EVENT.address(), message -> {
            JsonObject jsonObject = (JsonObject) message.body();
            EventPayload payload = jsonObject.getJsonObject("payload").mapTo(EventPayload.class);
            if (payload == null || payload.type() != EventPayload.TYPE_FILE_STATUS) {
                return;
            }

            if (payload.data() != null && payload.data() instanceof Map<?, ?> data && StrUtil.isNotBlank((String) data.get("downloadStatus"))) {
                FileRecord.DownloadStatus downloadStatus = FileRecord.DownloadStatus.valueOf((String) data.get("downloadStatus"));
                if (downloadStatus != FileRecord.DownloadStatus.completed) {
                    return;
                }
                FileRecord fileRecord = Future.await(DataVerticle.fileRepository.getByUniqueId((String) data.get("uniqueId")));

                SettingAutoRecords.Automation automation = null;
                if (fileRecord.threadChatId() != 0 && fileRecord.messageThreadId() != 0 && fileRecord.threadChatId() == fileRecord.chatId()) {
                    // thread message file,try to get the main message
                    FileRecord mainFileRecord = Future.await(DataVerticle.fileRepository.getMainFileByThread(
                            fileRecord.telegramId(),
                            fileRecord.threadChatId(),
                            fileRecord.messageThreadId()));
                    if (mainFileRecord != null) {
                        automation = autoRecords.getItem(mainFileRecord.telegramId(), mainFileRecord.chatId());
                    }
                } else {
                    automation = autoRecords.getItem(fileRecord.telegramId(), fileRecord.chatId());
                }

                if (automation == null || !automation.transfer.enabled || getTransfer(automation) == null) {
                    return;
                }

                if (addWaitingTransferFile(automation.telegramId, automation.chatId, fileRecord.uniqueId())) {
                    log.debug("Add file to transfer queue: %s".formatted(fileRecord.uniqueId()));
                }
            }
        });

        return Future.succeededFuture();
    }

    private void addHistoryFiles() {
        if (CollUtil.isEmpty(autoRecords.automations)) {
            return;
        }
        log.trace("Start scan history files for transfer");
        int totalAdded = 0;
        for (SettingAutoRecords.Automation automation : autoRecords.automations) {
            if (!automation.transfer.enabled
                || !automation.transfer.rule.transferHistory) {
                continue;
            }
            Transfer transfer = getTransfer(automation);
            if (transfer == null) {
                continue;
            }
            Tuple3<List<FileRecord>, Long, Long> filesTuple = Future.await(DataVerticle.fileRepository.getFiles(automation.chatId,
                    Map.of("downloadStatus", FileRecord.DownloadStatus.completed.name(),
                            "transferStatus", FileRecord.TransferStatus.idle.name(),
                            "limit", "200"
                    )
            ));
            List<FileRecord> files = filesTuple.v1;
            if (CollUtil.isEmpty(files)) {
                log.debug("No history files found for transfer: %s".formatted(automation.uniqueKey()));
                continue;
            }

            int count = 0;
            for (FileRecord fileRecord : files) {
                if (addWaitingTransferFile(fileRecord)) {
                    count++;
                }
            }

            if (count > 0) {
                totalAdded += count;
                log.info("Add history files to transfer queue: %s (chat: %s)".formatted(count, automation.uniqueKey()));
            }
        }
        if (totalAdded > 0) {
            log.info("Total history files added to transfer queue: %d".formatted(totalAdded));
        }
    }

    private boolean addWaitingTransferFile(FileRecord fileRecord) {
        return addWaitingTransferFile(fileRecord.telegramId(), fileRecord.chatId(), fileRecord.uniqueId());
    }

    private boolean addWaitingTransferFile(long telegramId, long chatId, String uniqueId) {
        if (waitingTransferFileIds.putIfAbsent(uniqueId, Boolean.TRUE) != null) {
            return false; // already in queue
        }
        waitingTransferFiles.add(new WaitingTransferFile(telegramId, chatId, uniqueId));
        return true;
    }

    private Transfer getTransfer(SettingAutoRecords.Automation automation) {
        if (automation == null || !automation.transfer.enabled) {
            return null;
        }

        SettingAutoRecords.TransferRule transferRule = automation.transfer.rule;
        String key = automation.uniqueKey();

        return transfers.compute(key, (k, existing) -> {
            if (existing != null && !existing.isRuleUpdated(transferRule)) {
                return existing;
            }
            if (existing != null) {
                log.debug("Transfer rule updated: %s".formatted(key));
            }
            Transfer transfer = Transfer.create(transferRule);
            transfer.setTelegramId(automation.telegramId);
            transfer.transferStatusUpdated = updated ->
                    updateTransferStatus(updated.fileRecord(), updated.transferStatus(), updated.localPath());
            return transfer;
        });
    }

    private void updateTransferStatus(FileRecord fileRecord, FileRecord.TransferStatus transferStatus, String localPath) {
        Future.await(DataVerticle.fileRepository.updateTransferStatus(fileRecord.uniqueId(), transferStatus, localPath)
                .onSuccess(fileUpdated -> {
                    if (fileUpdated != null && !fileUpdated.isEmpty()) {
                        EventPayload payload = EventPayload.build(EventPayload.TYPE_FILE_STATUS, new JsonObject()
                                .put("fileId", fileRecord.id())
                                .put("uniqueId", fileRecord.uniqueId())
                                .put("transferStatus", fileUpdated.getString("transferStatus"))
                                .put("localPath", fileUpdated.getString("localPath"))
                        );
                        vertx.eventBus().publish(EventEnum.TELEGRAM_EVENT.address(),
                                JsonObject.of("telegramId", fileRecord.telegramId(), "payload", JsonObject.mapFrom(payload))
                        );
                    }
                }));
    }

    private record WaitingTransferFile(long telegramId, long chatId, String uniqueId) {
    }
}
