/**
 * Notifications. Cross-feature imports come through this file only.
 */

export {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type NotificationsState,
} from './hooks';
export {
  resolveNotificationTarget,
  resolveTargetFromData,
  readNotificationKind,
  hrefForTarget,
  NOTIFICATION_KINDS,
  type NotificationTarget,
  type NotificationKind,
} from './targets';
export {
  NotificationRow,
  notificationIcon,
  type NotificationRowPosition,
  type NotificationRowProps,
} from './components/NotificationRow';
export {
  groupInbox,
  inboxGroupFor,
  INBOX_GROUP_LABELS,
  type InboxGroup,
  type InboxGroupKey,
} from './grouping';
