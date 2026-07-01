package telegram.files.repository.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.collection.IterUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.log.Log;
import cn.hutool.log.LogFactory;
import io.vertx.core.Future;
import io.vertx.sqlclient.SqlClient;
import io.vertx.sqlclient.templates.SqlTemplate;
import telegram.files.Config;
import telegram.files.repository.SettingKey;
import telegram.files.repository.SettingRecord;
import telegram.files.repository.SettingRepository;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class SettingRepositoryImpl extends AbstractSqlRepository implements SettingRepository {

    private static final Log log = LogFactory.get();

    public SettingRepositoryImpl(SqlClient sqlClient) {
        super(sqlClient);
    }

    @Override
    public Future<SettingRecord> createOrUpdate(String key, String value) {
        return SqlTemplate
                .forUpdate(sqlClient, Config.isMysql() ?
                        """
                                INSERT INTO setting_record(`key`, value) VALUES (#{key}, #{value})
                                ON DUPLICATE KEY UPDATE value = VALUES(value)""" :
                        """
                                INSERT INTO setting_record(key, value) VALUES (#{key}, #{value})
                                ON CONFLICT (key) DO UPDATE SET value = #{value}""")
                .mapFrom(SettingRecord.PARAM_MAPPER)
                .execute(new SettingRecord(key, value))
                .map(_ -> new SettingRecord(key, value))
                .onSuccess(_ -> log.trace("Successfully created or updated setting record: %s".formatted(key)))
                .onFailure(
                        err -> log.error("Failed to create or update setting record: %s".formatted(err.getMessage()))
                );
    }

    @Override
    public Future<List<SettingRecord>> getByKeys(List<String> keys) {
        if (CollUtil.isEmpty(keys)) {
            return Future.succeededFuture(List.of());
        }
        List<String> validKeys = keys.stream()
                .filter(StrUtil::isNotBlank)
                .distinct()
                .toList();
        if (validKeys.isEmpty()) {
            return Future.succeededFuture(List.of());
        }
        String placeholders = java.util.stream.IntStream.range(0, validKeys.size())
                .mapToObj(i -> "#{key" + i + "}")
                .collect(Collectors.joining(","));
        Map<String, Object> params = new java.util.HashMap<>();
        for (int i = 0; i < validKeys.size(); i++) {
            params.put("key" + i, validKeys.get(i));
        }

        return SqlTemplate
                .forQuery(sqlClient, """
                        SELECT %s, value FROM setting_record WHERE %s IN (%s)
                        """.formatted(SettingRecord.KEY_FIELD, SettingRecord.KEY_FIELD, placeholders))
                .mapTo(SettingRecord.ROW_MAPPER)
                .execute(params)
                .map(IterUtil::toList)
                .onSuccess(_ -> log.trace("Successfully fetched setting record for keys: " + validKeys))
                .onFailure(
                        err -> log.error("Failed to fetch setting record: %s".formatted(err.getMessage()))
                );
    }

    @Override
    @SuppressWarnings("unchecked")
    public <T> Future<T> getByKey(SettingKey key) {
        return SqlTemplate
                .forQuery(sqlClient, """
                        SELECT value FROM setting_record WHERE %s = #{key}
                        """.formatted(SettingRecord.KEY_FIELD))
                .mapTo(row -> row.getString("value"))
                .execute(Map.of("key", key.name()))
                .map(rs -> {
                    if (rs.size() == 1) {
                        return (T) key.converter.apply(rs.iterator().next());
                    }
                    return key.defaultValue == null ? null : (T) key.defaultValue;
                })
                .onSuccess(_ -> log.trace("Successfully fetched setting record for key: " + key))
                .onFailure(
                        err -> log.error("Failed to fetch setting record: %s".formatted(err.getMessage()))
                );
    }
}
