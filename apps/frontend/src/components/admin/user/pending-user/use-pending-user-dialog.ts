import {
  PendingUser,
  PendingUserAction,
  PendingUserDialogState,
} from '@/components/admin/user/pending-user/pending-user-list.types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const PENDING_USER_ACTION_PARAM = 'action';
const PENDING_USER_ID_PARAM = 'user_id';

const parsePendingUserAction = (
  action: string | null
): PendingUserAction | null =>
  action === 'approve' || action === 'deny' ? action : null;

interface ResolvedPendingUserDialogState {
  dialog: PendingUserDialogState | null;
  alreadyProcessed: boolean;
}

const resolvePendingUserDialogState = (
  searchParams: URLSearchParams,
  userData: PendingUser[]
): ResolvedPendingUserDialogState => {
  const action = parsePendingUserAction(
    searchParams.get(PENDING_USER_ACTION_PARAM)
  );
  const userId = searchParams.get(PENDING_USER_ID_PARAM);
  if (!action || !userId) {
    return { dialog: null, alreadyProcessed: false };
  }

  const user = userData.find(({ id }) => id === userId);
  if (user) {
    return { dialog: { action, user }, alreadyProcessed: false };
  }

  return { dialog: null, alreadyProcessed: true };
};

interface UsePendingUserDialogParams {
  /** The pending users on screen, undefined until they are first loaded. */
  userData: PendingUser[] | undefined;
  approveUser: (user: PendingUser) => void;
  rejectUser: (user: PendingUser) => void;
}

export const usePendingUserDialog = ({
  userData,
  approveUser,
  rejectUser,
}: UsePendingUserDialogParams) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [pendingUserDialog, setPendingUserDialog] =
    useState<PendingUserDialogState | null>(null);
  const [alreadyProcessedDialogOpen, setAlreadyProcessedDialogOpen] =
    useState<boolean>(false);
  const [isUrlResolved, setIsUrlResolved] = useState(false);

  // The URL is resolved once, as soon as the pending users are loaded: before
  // that, a user named in the URL would wrongly look already processed.
  if (!isUrlResolved && userData) {
    const { dialog, alreadyProcessed } = resolvePendingUserDialogState(
      searchParams,
      userData
    );
    setIsUrlResolved(true);
    setPendingUserDialog(dialog);
    setAlreadyProcessedDialogOpen(alreadyProcessed);
  }

  const openPendingUserDialog = useCallback(
    (action: PendingUserAction, user: PendingUser) => {
      setPendingUserDialog({ action, user });
    },
    []
  );

  const openApproveDialog = useCallback(
    (user: PendingUser) => {
      openPendingUserDialog('approve', user);
    },
    [openPendingUserDialog]
  );

  const openRejectDialog = useCallback(
    (user: PendingUser) => {
      openPendingUserDialog('deny', user);
    },
    [openPendingUserDialog]
  );

  const closePendingUserDialog = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setPendingUserDialog(null);
    }
  }, []);

  const closeAlreadyProcessedDialog = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setAlreadyProcessedDialogOpen(false);
    }
  }, []);

  const onConfirmPendingUserAction = useCallback(() => {
    if (!pendingUserDialog) {
      return;
    }

    if (pendingUserDialog.action === 'approve') {
      approveUser(pendingUserDialog.user);
      return;
    }

    rejectUser(pendingUserDialog.user);
  }, [approveUser, pendingUserDialog, rejectUser]);

  useEffect(() => {
    if (!isUrlResolved) {
      return;
    }
    if (
      !searchParams.has(PENDING_USER_ACTION_PARAM) &&
      !searchParams.has(PENDING_USER_ID_PARAM)
    ) {
      return;
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    nextSearchParams.delete(PENDING_USER_ACTION_PARAM);
    nextSearchParams.delete(PENDING_USER_ID_PARAM);
    const nextSearch = nextSearchParams.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname);
  }, [isUrlResolved, pathname, router, searchParams]);

  return {
    pendingUserDialog,
    openApproveDialog,
    openRejectDialog,
    closePendingUserDialog,
    onConfirmPendingUserAction,
    alreadyProcessedDialogOpen,
    closeAlreadyProcessedDialog,
  };
};
