import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client for user lookup
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { email, project_id, role } = await req.json();

    console.log(`[invite-collaborator] Received request for email: ${email}, project: ${project_id}, role: ${role}`);

    // Validate input
    if (!email || !project_id) {
      console.error("[invite-collaborator] Missing required fields");
      return new Response(
        JSON.stringify({ error: "Email and project_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.error("[invite-collaborator] Invalid email format");
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["viewer", "editor"];
    const normalizedRole = role || "editor";
    if (!validRoles.includes(normalizedRole)) {
      console.error("[invite-collaborator] Invalid role");
      return new Response(
        JSON.stringify({ error: "Role must be 'viewer' or 'editor'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[invite-collaborator] Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the requesting user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("[invite-collaborator] Invalid token:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestingUserId = claimsData.claims.sub;
    console.log(`[invite-collaborator] Requesting user: ${requestingUserId}`);

    // Check if the requesting user owns the project
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("user_id")
      .eq("id", project_id)
      .single();

    if (projectError || !project) {
      console.error("[invite-collaborator] Project not found:", projectError);
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (project.user_id !== requestingUserId) {
      console.error("[invite-collaborator] User is not project owner");
      return new Response(
        JSON.stringify({ error: "Only project owners can invite collaborators" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the user by email using admin API
    const normalizedEmail = email.trim().toLowerCase();
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error("[invite-collaborator] Error listing users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to look up user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!targetUser) {
      console.log(`[invite-collaborator] User not found with email: ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ error: "User not found. They must sign up first before being invited." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[invite-collaborator] Found target user: ${targetUser.id}`);

    // Check if the user is trying to invite themselves
    if (targetUser.id === requestingUserId) {
      console.error("[invite-collaborator] User trying to invite themselves");
      return new Response(
        JSON.stringify({ error: "You cannot invite yourself to your own project" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user is already a collaborator
    const { data: existingCollab } = await supabaseAdmin
      .from("project_collaborators")
      .select("id")
      .eq("project_id", project_id)
      .eq("user_id", targetUser.id)
      .single();

    if (existingCollab) {
      console.log("[invite-collaborator] User is already a collaborator");
      return new Response(
        JSON.stringify({ error: "User is already a collaborator on this project" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the collaborator record with the real user ID
    const { data: newCollab, error: insertError } = await supabaseAdmin
      .from("project_collaborators")
      .insert({
        project_id,
        user_id: targetUser.id,
        user_email: normalizedEmail,
        role: normalizedRole,
        invited_by: requestingUserId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[invite-collaborator] Error creating collaborator:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create collaborator" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[invite-collaborator] Successfully created collaborator: ${newCollab.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        collaborator: {
          id: newCollab.id,
          user_id: newCollab.user_id,
          user_email: newCollab.user_email,
          role: newCollab.role,
          created_at: newCollab.created_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[invite-collaborator] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
