// This is a Supabase Edge Function that handles auth events
// It creates a profile when a user confirms their email

export async function handleAuth(event, context) {
  const { type, record } = event.request.body;
  const { supabaseClient } = context;

  // Only proceed if this is a signup confirmation
  if (type === 'AUTH_CONFIRM_SIGNUP') {
    try {
      // Get user metadata
      const { data: { user }, error: userError } = await supabaseClient.auth.admin.getUserById(record.id);
      
      if (userError) throw userError;

      // Create profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
          id: user.id,
          full_name: user.user_metadata.full_name,
          email: user.email,
          account_type: user.user_metadata.account_type
        }]);

      if (profileError) throw profileError;

      return { statusCode: 200, body: JSON.stringify({ message: 'Profile created successfully' }) };
    } catch (error) {
      console.error('Error in auth webhook:', error);
      return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    }
  }

  return { statusCode: 200, body: JSON.stringify({ message: 'Event processed' }) };
} 