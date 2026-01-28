// Sharing Types - Partner & Friend Models

// ============================================================================
// Collaborator Types (Extended)
// ============================================================================

export type CollaboratorType = 'partner' | 'friend';

export interface Collaborator {
  id: number;
  owner_id: number;
  collaborator_id: number | null;
  target_user_id: number | null;
  invite_code: string;
  invite_expires_at: string;
  invite_message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'revoked';
  type: CollaboratorType;
  created_at: string;
  accepted_at: string | null;
}

export interface CollaboratorWithUser extends Collaborator {
  owner_name: string;
  owner_email: string;
  owner_username: string | null;
  owner_image: string | null;
  collaborator_name: string | null;
  collaborator_email: string | null;
  collaborator_username: string | null;
  collaborator_image: string | null;
}

// ============================================================================
// Partner Types
// ============================================================================

export interface PartnerList {
  id: number;
  name: string;
  created_at: string;
}

export interface PartnerListWithDetails extends PartnerList {
  item_count: number;
  members: PartnerListMember[];
  // Computed: items where both have watched
  watched_together_count: number;
}

export interface PartnerListMember {
  id: number;
  partner_list_id: number;
  user_id: number;
  collaborator_id: number | null;
  role: 'owner' | 'member';
  joined_at: string;
  // Joined fields
  user_name?: string;
  user_image?: string | null;
}

export interface PartnerListItem {
  id: number;
  partner_list_id: number;
  media_id: number;
  added_by_user_id: number | null;
  created_at: string;
}

export interface PartnerListItemWithDetails extends PartnerListItem {
  // Media info
  media_title: string;
  media_poster_path: string | null;
  media_type: 'movie' | 'tv';
  media_tmdb_id: number;
  media_release_year: number | null;
  // Who added it
  added_by_name: string | null;
  added_by_image: string | null;
  // Status for each member
  statuses: PartnerListItemStatus[];
  // Computed
  is_watched_together: boolean;
  watched_by_user_ids: number[];
}

export interface PartnerListItemStatus {
  id: number;
  item_id: number;
  user_id: number;
  watched: boolean;
  watched_at: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  // Joined
  user_name?: string;
  user_image?: string | null;
}

// ============================================================================
// Friend Types
// ============================================================================

export interface Friend {
  id: number; // collaborator id
  user_id: number;
  name: string;
  username: string | null;
  image: string | null;
  connected_at: string;
  // Stats
  suggestions_received: number;
  suggestions_sent: number;
}

// ============================================================================
// Suggestion Types
// ============================================================================

export type SuggestionStatus = 'pending' | 'accepted' | 'dismissed';

export interface FriendSuggestion {
  id: number;
  from_user_id: number;
  to_user_id: number;
  media_id: number;
  note: string | null;
  status: SuggestionStatus;
  created_at: string;
  responded_at: string | null;
}

export interface FriendSuggestionWithDetails extends FriendSuggestion {
  // From user info
  from_user_name: string;
  from_user_username: string | null;
  from_user_image: string | null;
  // Media info
  media_title: string;
  media_poster_path: string | null;
  media_type: 'movie' | 'tv';
  media_tmdb_id: number;
  media_release_year: number | null;
}

// Grouped suggestions from same user (for notifications)
export interface GroupedSuggestions {
  from_user_id: number;
  from_user_name: string;
  from_user_username: string | null;
  from_user_image: string | null;
  suggestions: FriendSuggestionWithDetails[];
  total_count: number;
  latest_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Partner invite
export interface CreatePartnerInviteRequest {
  listName?: string; // Optional: create shared list on accept
}

export interface CreatePartnerInviteResponse {
  inviteCode: string;
  expiresAt: string;
}

export interface AcceptPartnerInviteRequest {
  listName: string; // Name for the shared list (e.g., "Our Watchlist")
}

// Partner list operations
export interface AddToPartnerListRequest {
  mediaId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
}

export interface UpdatePartnerItemStatusRequest {
  watched?: boolean;
  rating?: number | null;
}

export interface MarkWatchedTogetherRequest {
  rating?: number; // Optional: your rating when marking watched together
}

// Friend operations
export interface CreateFriendInviteRequest {
  message?: string;
}

// Suggestion operations
export interface CreateSuggestionRequest {
  toUserIds: number[]; // Can suggest to multiple friends at once
  mediaId: number;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string;
  note?: string;
}

export interface CreateSuggestionResponse {
  created: number;
  alreadyExists: number;
  alreadyOnList: number;
}

export interface AcceptSuggestionRequest {
  status?: string; // Optional: what status to add with (default: 'watchlist')
}

// ============================================================================
// UI State Types
// ============================================================================

export interface PartnerInfo {
  collaboratorId: number;
  userId: number;
  name: string;
  username: string | null;
  image: string | null;
  connectedAt: string;
  sharedLists: PartnerListWithDetails[];
}

export interface SharingState {
  partner: PartnerInfo | null;
  friends: Friend[];
  pendingSuggestions: GroupedSuggestions[];
  pendingSuggestionsCount: number;
  isLoading: boolean;
}

// ============================================================================
// List Visibility Types (Friend List Sharing)
// ============================================================================

export type VisibilityLevel = 'private' | 'select_friends' | 'friends' | 'public';

export const SYSTEM_LIST_TYPES = [
  'watchlist',
  'watching',
  'finished'
] as const;

export type SystemListType = typeof SYSTEM_LIST_TYPES[number];

export interface ListVisibilitySetting {
  listType: string;
  listId: number | null; // null for system lists
  visibility: VisibilityLevel;
  updatedAt?: string;
}

export interface FriendListAccess {
  id: number;
  friendId: number;
  friendName: string;
  friendUsername: string | null;
  friendImage: string | null;
  listType: string;
  listId: number | null;
  canEdit: boolean;
  grantedAt: string;
}

export interface ListWithAccessInfo {
  listType: string;
  listId: number | null;
  listName: string;
  visibility: VisibilityLevel;
  friendCount: number;
  itemCount?: number;
}

export interface FriendWithSharedLists {
  friendId: number;
  friendName: string;
  friendUsername: string | null;
  friendImage: string | null;
  sharedListCount: number;
}

export interface SharedListSummary {
  listType: string;
  listId: number | null;
  listName: string;
  itemCount: number;
  canEdit: boolean;
}

// API Request/Response types for list visibility

export interface SetListVisibilityRequest {
  listType: string;
  listId?: number | null;
  visibility: VisibilityLevel;
}

export interface GrantFriendAccessRequest {
  friendId: number;
  listType: string;
  listId?: number | null;
  canEdit?: boolean;
}

export interface GrantMultipleFriendsAccessRequest {
  friendIds: number[];
  listType: string;
  listId?: number | null;
  canEdit?: boolean;
}

export interface SetDefaultSharingRequest {
  lists: Array<{
    listType: string;
    listId?: number | null;
    shareByDefault: boolean;
  }>;
}

export interface FriendAcceptedListSelectionRequest {
  friendId: number;
  listsToShare: Array<{
    listType: string;
    listId?: number | null;
  }>;
  saveAsDefault?: boolean;
}
