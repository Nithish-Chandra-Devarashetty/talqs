/**
 * User identification utilities
 * Provides consistent user identification across sessions
 */

/**
 * Get a consistent user ID that persists across sessions
 * IMPORTANT: This always returns the same persistent ID, even if the user is authenticated
 * This ensures that a user's history is consistent regardless of authentication state
 */
export function getUserId(): string {
  // ALWAYS use the persistent ID for history tracking
  // This ensures history is consistent even if authentication state changes
  let persistentId = localStorage.getItem('talqs_persistent_user_id');
  
  // If no persistent ID exists, create one and migrate existing history
  if (!persistentId) {
    // Generate a unique ID that will persist across sessions
    persistentId = `user-${Date.now()}`;
    localStorage.setItem('talqs_persistent_user_id', persistentId);
    console.log('Created new persistent user ID:', persistentId);
    
    // Migrate existing history to the new ID
    migrateExistingHistory(persistentId);
  }
  
  return persistentId;
}

/**
 * Migrate existing chat history to the new persistent user ID
 * This ensures that users don't lose their history when we change the ID system
 */
function migrateExistingHistory(newUserId: string): void {
  try {
    // Check for existing chat history
    const chatHistoryStr = localStorage.getItem('talqs_chat_history');
    if (!chatHistoryStr) return;
    
    const chatHistory = JSON.parse(chatHistoryStr);
    if (!Array.isArray(chatHistory) || chatHistory.length === 0) return;
    
    console.log(`Migrating ${chatHistory.length} conversations to new user ID: ${newUserId}`);
    
    // Check for old user IDs
    const oldUserIds = [
      localStorage.getItem('talqs_user_id'),
      localStorage.getItem('talqs_auth_email'),
      'local-user'
      // We don't have access to session here, but we'll catch any session emails
      // through the existingUserIds check below
    ].filter(Boolean);
    
    // Also check for any existing user IDs in the chat history
    const existingUserIds = new Set<string>();
    chatHistory.forEach((chat: any) => {
      if (chat.userId) existingUserIds.add(chat.userId);
    });
    
    // Combine all possible old user IDs
    oldUserIds.push(...Array.from(existingUserIds));
    
    console.log('Found old user IDs:', oldUserIds);
    
    // Update all conversations to use the new user ID
    let migratedCount = 0;
    chatHistory.forEach((chat: any) => {
      // If this chat belongs to any of the old user IDs, update it
      if (oldUserIds.includes(chat.userId)) {
        chat.userId = newUserId;
        migratedCount++;
      }
    });
    
    // Save the updated chat history
    localStorage.setItem('talqs_chat_history', JSON.stringify(chatHistory));
    console.log(`Migrated ${migratedCount} conversations to new user ID: ${newUserId}`);
  } catch (error) {
    console.error('Error migrating chat history:', error);
  }
}

/**
 * Get the user's display name
 * Uses authenticated name if available, otherwise uses the persistent ID
 */
export function getUserDisplayName(): string {
  // Check for authenticated user in localStorage (set during login)
  const authUserStr = localStorage.getItem('talqs_auth_user');
  if (authUserStr) {
    try {
      const authUser = JSON.parse(authUserStr);
      if (authUser.name) {
        return authUser.name;
      }
      if (authUser.email) {
        return authUser.email;
      }
    } catch (e) {
      console.error('Error parsing auth user:', e);
    }
  }
  
  // Fall back to persistent ID
  return getUserId();
}

/**
 * Store authenticated user information
 * Call this when a user logs in
 * IMPORTANT: This does NOT change the persistent user ID
 */
export function storeAuthUser(user: { email: string, name?: string, image?: string }): void {
  if (!user || !user.email) return;
  
  // Store authenticated user info for display purposes only
  localStorage.setItem('talqs_auth_user', JSON.stringify(user));
  
  // Store the email separately for reference
  localStorage.setItem('talqs_auth_email', user.email);
  
  console.log('Stored authenticated user:', user.email);
  console.log('Persistent user ID remains unchanged:', getUserId());
}

/**
 * Clear authenticated user information
 * Call this when a user logs out
 * IMPORTANT: This does NOT clear the persistent user ID or chat history
 */
export function clearAuthUser(): void {
  localStorage.removeItem('talqs_auth_user');
  localStorage.removeItem('talqs_auth_email');
  console.log('Cleared authenticated user');
  console.log('Persistent user ID remains unchanged:', getUserId());
}

/**
 * Check if the user is authenticated
 */
export function isUserAuthenticated(): boolean {
  const authUserStr = localStorage.getItem('talqs_auth_user');
  return !!authUserStr;
}
