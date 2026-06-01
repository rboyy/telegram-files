import { useTelegramMethod } from "@/hooks/use-telegram-method";
import useSWRMutation from "swr/mutation";
import { request } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useSWRConfig } from "swr";
import React, {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useDebounce } from "use-debounce";
import { Ellipsis, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  TelegramConstructor,
  type TelegramObject,
  WebSocketMessageType,
} from "@/lib/websocket-types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useWebsocket } from "@/hooks/use-websocket";
import { useTelegramAccount } from "@/hooks/use-telegram-account";
import TGDuck16Plane from "@/components/animations/tg-duck16_plane.json";
import TGQRPlane from "@/components/animations/tg-qr-plane.json";
import dynamic from "next/dynamic";
import QRCodeStyling, { type Options } from "qr-code-styling";

interface AccountCreatorProps {
  isAdd?: boolean;
  proxyName: string | undefined;
  onCreated?: (id: string) => void;
  onLoginSuccess?: () => void;
}

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

export default function AccountCreator({
  isAdd,
  proxyName,
  onCreated,
  onLoginSuccess,
}: AccountCreatorProps) {
  const { triggerMethod, isMethodExecuting } = useTelegramMethod();
  const { toast } = useToast();
  const { mutate } = useSWRConfig();
  const { lastJsonMessage } = useWebsocket();
  const { account, resetAccount } = useTelegramAccount();
  const [initSuccessfully, setInitSuccessfully] = useState(false);
  const [authState, setAuthState] = useState<number | undefined>(undefined);
  const [qrCodeLink, setQrCodeLink] = useState<string | undefined>(undefined);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [isDeMethodExecuting] = useDebounce(isMethodExecuting, 500, {
    leading: true,
  });
  const {
    trigger: triggerCreate,
    isMutating: isCreateMutating,
    error: createError,
  } = useSWRMutation<{ id: string }, Error>(
    "/telegram/create",
    async (key: string) => {
      return await request(key, {
        method: "POST",
        body: JSON.stringify({
          proxyName: proxyName,
        }),
      });
    },
    {
      onSuccess: (data) => {
        onCreated?.(data.id);
      },
    },
  );
  const [debounceIsCreateMutating] = useDebounce(isCreateMutating, 1000, {
    leading: true,
  });

  const handleAuthState = useCallback(
    (state: TelegramObject) => {
      switch (state.constructor) {
        case TelegramConstructor.WAIT_PHONE_NUMBER:
        case TelegramConstructor.WAIT_CODE:
        case TelegramConstructor.WAIT_PASSWORD:
          setAuthState(state.constructor);
          break;
        case TelegramConstructor.WAIT_OTHER_DEVICE_CONFIRMATION:
          setAuthState(state.constructor);
          setQrCodeLink(state.link as string);
          break;
        case TelegramConstructor.STATE_READY:
          toast({
            variant: "success",
            description: "账户添加成功",
          });
          setTimeout(() => {
            void mutate("/telegrams");
            onLoginSuccess?.();
            setPhoneNumber("");
            setCode("");
            setPassword("");
          }, 1000);
          break;
        default:
          setTimeout(() => {
            void mutate("/telegrams");
          }, 500);
          console.log("Unknown telegram constructor:", state.constructor);
      }
    },
    [mutate, onLoginSuccess, toast],
  );

  useEffect(() => {
    if (account) {
      if (
        !isAdd &&
        account.status === "inactive" &&
        account.lastAuthorizationState
      ) {
        setInitSuccessfully(true);
        handleAuthState(account.lastAuthorizationState);
        return;
      }
    }

    if (isAdd && !initSuccessfully) {
      resetAccount();
    }
  }, [account, handleAuthState, initSuccessfully, isAdd, resetAccount]);

  useEffect(() => {
    if (!lastJsonMessage) return;

    if (lastJsonMessage.type === WebSocketMessageType.AUTHORIZATION) {
      handleAuthState(lastJsonMessage.data as TelegramObject);
    }
  }, [handleAuthState, lastJsonMessage]);

  useEffect(() => {
    if (phoneNumber) {
      setPhoneNumber((prev) => prev.replaceAll(/\D/g, ""));
    }
  }, [phoneNumber]);

  if (debounceIsCreateMutating) {
    return (
      <div className="flex items-center justify-center space-x-2 text-xl">
        <span>正在初始化账户，请稍候</span>
        <Ellipsis className="h-4 w-4 animate-pulse" />
      </div>
    );
  }

  if (createError) {
    return (
      <div className="text-center text-xl">
        <span className="mr-3 text-3xl">😲</span>
        初始化账户失败，请稍后重试。
      </div>
    );
  }

  if (!initSuccessfully) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <Lottie
          className="mb-10 h-28 w-28 md:mb-3"
          animationData={TGDuck16Plane}
          loop={true}
        />
        <Button
          className={cn("w-full", debounceIsCreateMutating ? "opacity-50" : "")}
          disabled={debounceIsCreateMutating}
          onClick={async () => {
            await triggerCreate().then(() => {
              void mutate("/telegrams");
              setInitSuccessfully(true);
            });
          }}
        >
          开始初始化
        </Button>
      </div>
    );
  }

  if (!authState && !isMethodExecuting) {
    return (
      <div className="flex flex-col items-center justify-center space-y-2 rounded bg-gray-50 p-2">
        <p>正在等待 Telegram 账户初始化，请稍候。</p>
        <p>如果等待时间过长，请刷新页面或稍后重试。</p>
        <Ellipsis className="h-4 w-4 animate-pulse" />
      </div>
    );
  }

  const authStateFormFields = {
    [TelegramConstructor.WAIT_PHONE_NUMBER]: (
      <div className="space-y-2">
        <Label htmlFor="phone">电话号码</Label>
        <p className="text-xs text-gray-500">
          必须包含国家代码，例如：8613712345678
        </p>
        <Input
          id="phone"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          disabled={isMethodExecuting}
          required
        />
      </div>
    ),
    [TelegramConstructor.WAIT_OTHER_DEVICE_CONFIRMATION]: (
      <QRCode link={qrCodeLink} />
    ),
    [TelegramConstructor.WAIT_CODE]: (
      <div className="space-y-2">
        <Label htmlFor="code">验证码</Label>
        <p className="text-xs text-gray-500">
          请输入发送到您的 Telegram 账户的验证码。
        </p>
        <InputOTP
          id="code"
          maxLength={6}
          value={code}
          disabled={isMethodExecuting}
          required
          onChange={(value) => setCode(value)}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>
    ),
    [TelegramConstructor.WAIT_PASSWORD]: (
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <p className="text-xs text-gray-500">
          您已启用两步验证，请输入您的密码。
        </p>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isMethodExecuting}
          required
        />
      </div>
    ),
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (authState === TelegramConstructor.WAIT_PHONE_NUMBER) {
      await triggerMethod({
        data: {
          phoneNumber: phoneNumber,
          settings: null,
        },
        method: "SetAuthenticationPhoneNumber",
      });
    } else if (authState === TelegramConstructor.WAIT_CODE) {
      await triggerMethod({
        data: {
          code: code,
        },
        method: "CheckAuthenticationCode",
      });
    } else if (authState === TelegramConstructor.WAIT_PASSWORD) {
      await triggerMethod({
        data: {
          password: password,
        },
        method: "CheckAuthenticationPassword",
      });
    }
  };

  const handleRequestQrCodeAuthentication = async () => {
    await triggerMethod({
      data: {
        otherUserIds: null,
      },
      method: "RequestQrCodeAuthentication",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {authState && (
        <>
          {authStateFormFields[authState]}
          {authState !== TelegramConstructor.WAIT_OTHER_DEVICE_CONFIRMATION && (
            <Button
              type="submit"
              className={cn("w-full", isMethodExecuting ? "opacity-50" : "")}
              disabled={isMethodExecuting}
            >
              {isDeMethodExecuting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                "🚀 提交"
              )}
            </Button>
          )}
          {authState === TelegramConstructor.WAIT_PHONE_NUMBER && (
            <Button
              variant="outline"
              className={cn("w-full", isMethodExecuting ? "opacity-50" : "")}
              disabled={isMethodExecuting}
              onClick={handleRequestQrCodeAuthentication}
            >
              {isDeMethodExecuting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                "通过二维码登录"
              )}
            </Button>
          )}
        </>
      )}
    </form>
  );
}

const options: Options = {
  width: 280,
  height: 280,
  type: "svg",
  image: "blank.png",
  margin: 10,
  qrOptions: {
    errorCorrectionLevel: "M",
  },
  cornersSquareOptions: {
    type: "extra-rounded",
  },
  imageOptions: {
    imageSize: 0.4,
    margin: 8,
  },
  dotsOptions: {
    type: "rounded",
  },
};

function QRCode({ link }: { link?: string }) {
  const [qrCode, setQrCode] = useState<QRCodeStyling>();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      qrCode?.append(ref.current);
    }
  }, [qrCode, ref]);

  useEffect(() => {
    if (link) {
      if (!qrCode) {
        const qrCode = new QRCodeStyling({
          ...options,
          data: link,
        });
        setQrCode(qrCode);
      } else {
        qrCode.update({
          data: link,
        });
      }
    }
  }, [link, qrCode]);

  if (!link) {
    return (
      <div className="flex items-center justify-center">
        <LoaderCircle className="h-14 w-14 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="relative flex items-center justify-center">
        <div className="overflow-hidden rounded-3xl bg-white" ref={ref} />
        <Lottie
          className="absolute left-1/2 top-1/2 z-10 h-14 w-14 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gray-800"
          animationData={TGQRPlane}
          loop={true}
        />
      </div>
      <div className="rounded-lg bg-white bg-opacity-80 p-1 dark:bg-gray-800">
        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          使用您的 Telegram 应用扫描二维码登录。
        </p>
      </div>
    </div>
  );
}
