import { toast } from 'sonner';
import StatusIcon from '@/components/ui/StatusIcon';
import { SYSTEM_LIST_MAP } from '@/lib/list-config';

type MediaStatus = 'watchlist' | 'watching' | 'watched';

interface StatusChangeOptions {
  title: string;
  mediaType?: 'movie' | 'tv';
  previousStatus?: string | null;
}

// Toast content component for consistent styling
function ToastContent({
  iconStatus,
  message,
  description,
}: {
  iconStatus: string;
  message: string;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <StatusIcon status={iconStatus} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm">{message}</p>
        {description && (
          <p className="text-gray-300 text-sm truncate">{description}</p>
        )}
      </div>
    </div>
  );
}

export function showStatusChange(status: MediaStatus, options: StatusChangeOptions) {
  // Normalize status for config lookup
  const configKey = status === 'watched' ? 'finished' : status;
  const config = SYSTEM_LIST_MAP[configKey];
  const listName = config?.title || status;

  // Determine if this is an "Added" or "Moved" action
  const action = options.previousStatus ? 'Moved to' : 'Added to';
  const message = `${action} ${listName}`;

  toast.custom(() => (
    <ToastContent
      iconStatus={configKey}
      message={message}
      description={options.title}
    />
  ));
}

export function showAddedToFavorites(title: string) {
  toast.custom(() => (
    <ToastContent
      iconStatus="favorites"
      message="Added to Favorites"
      description={title}
    />
  ));
}

export function showRemovedFromFavorites(title: string) {
  toast.custom(() => (
    <ToastContent
      iconStatus="favorites-remove"
      message="Removed from Favorites"
      description={title}
    />
  ));
}

export function showLabelAdded(labelName: string, title: string) {
  toast.custom(() => (
    <ToastContent
      iconStatus="label"
      message={`Added to ${labelName}`}
      description={title}
    />
  ));
}

export function showLabelRemoved(labelName: string, title: string) {
  toast.custom(() => (
    <ToastContent
      iconStatus="label-remove"
      message={`Removed from ${labelName}`}
      description={title}
    />
  ));
}

export function showRemovedFromLibrary(title: string) {
  toast.custom(() => (
    <ToastContent
      iconStatus="remove"
      message="Removed from Library"
      description={title}
    />
  ));
}

export function showSuccess(message: string, description?: string) {
  toast.custom(() => (
    <ToastContent
      iconStatus="success"
      message={message}
      description={description}
    />
  ));
}

export function showError(message: string, description?: string) {
  toast.custom(() => (
    <ToastContent
      iconStatus="error"
      message={message}
      description={description}
    />
  ));
}

export function showLoading(message: string) {
  return toast.loading(message);
}

export function dismissToast(toastId: string | number) {
  toast.dismiss(toastId);
}
