'use client';

import { FamilyMember } from '@/types/database';
import { LogOut, Settings, Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface HeaderProps {
  authMember: FamilyMember | null;
  onSignOut: () => void;
}

export function Header({ authMember, onSignOut }: HeaderProps) {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications(authMember?.id);

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-[#F28705]">
          ファミタス
        </h1>
        <div className="flex items-center gap-3">
          {authMember && (
            <div className="flex items-center gap-2">
              <span className="text-xl">{authMember.avatar}</span>
              <span className="text-sm font-medium">{authMember.name}</span>
            </div>
          )}
          <Sheet>
            <SheetTrigger className="flex items-center justify-center w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Settings className="w-4 h-4" />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>設定</SheetTitle>
                <SheetDescription>アプリの設定を変更できます</SheetDescription>
              </SheetHeader>
              <div className="px-4 space-y-6">
                {isSupported && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isSubscribed ? (
                        <Bell className="w-5 h-5 text-primary" />
                      ) : (
                        <BellOff className="w-5 h-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium">プッシュ通知</p>
                        <p className="text-xs text-muted-foreground">
                          {permission === 'denied'
                            ? 'ブラウザの設定で通知がブロックされています'
                            : 'タスクの追加や完了を通知で受け取ります'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isSubscribed}
                      onCheckedChange={handleToggle}
                      disabled={permission === 'denied'}
                    />
                  </div>
                )}
                <hr className="border-border" />
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-3 w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <LogOut className="w-5 h-5" />
                  ログアウト
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="h-0.5 bg-[#F29F05]" />
    </header>
  );
}
