import { supabase } from './supabase.js'

/**
 * Auto-add user to PROFILES table when they login
 * Automatically assigns roles based on their position in GoldQuill
 *
 * NOTE: Users can have multiple positions (e.g., both Writer and Section Head)
 * The system assigns the HIGHEST role based on role hierarchy:
 * 1. admin (SYSTEM ADMIN - access to admin panel, manage all users/settings)
 * 2. editor (Technical Editor, Creative Director, EIC, Chief Adviser, Archive Manager)
 * 3. section_head (Section Head - manage their section)
 * 4. member (Writer, Artist)
 *
 * IMPORTANT: "admin" role = System Admins ONLY (not content admins like EIC)
 * Content administrators (EIC, Technical Editor, etc.) have 'editor' role
 *
 * Example: If someone is in both SECTION_HEAD_EMAILS and WRITER_EMAILS,
 * they will be assigned 'section_head' role (higher in hierarchy)
 */

// ⭐ Role-based user mappings (users can appear in multiple lists)

// SYSTEM ADMINS ONLY - Access to admin panel and system settings
const ADMIN_EMAILS = [
  'yssahjulianah.barcial@carsu.edu.ph',
  'lovellhudson.clavel@carsu.edu.ph',
  'altheaguila.gorres@carsu.edu.ph',
]

const SECTION_HEAD_EMAILS = [
  'lexzyrrehdevonnaire.abellanosa@carsu.edu.ph',
  'jessahmei.allard@carsu.edu.ph',
  'nevlim.baldelovar@carsu.edu.ph',
  'rexter.etang@carsu.edu.ph',
  'jerbyclaire.factularin@carsu.edu.ph',
  'jofredjames.gerasmio@carsu.edu.ph',
  'megumierika.labaja@carsu.edu.ph',
  'elainepearl.silagan@carsu.edu.ph',
  'samuellhoide.ursales@carsu.edu.ph',
  'kentadriane.vinatero@carsu.edu.ph',
]

// Content Administrators - Have 'editor' role (NOT system admin)
// Includes: Technical Editor, Creative Director, Editor-in-Chief, Archive Managers
const EDITOR_EMAILS = [
  'jonee.elopre@carsu.edu.ph', // Technical Editor
  'levibrian.cejuela@carsu.edu.ph', // Creative Director
  'melede.ganoy@carsu.edu.ph', // Editor-in-Chief
  'julesleo.reserva@carsu.edu.ph', // Archive Manager (also artist)
  'eizzielmarie.bacoy@carsu.edu.ph', // Archive Manager
]

const WRITER_EMAILS = [
  'nissi.abes@carsu.edu.ph',
  'sophija.bentulan@carsu.edu.ph',
  'joshuajosh.coralde@carsu.edu.ph',
  'lordelie.darog@carsu.edu.ph',
  'jezwer.delima@carsu.edu.ph',
  'jellanaille.denonong@carsu.edu.ph',
  'devorahgrace.esguerra@carsu.edu.ph',
  'shienygriethzer.lozada@carsu.edu.ph',
  'kayadanielle.nason@carsu.edu.ph',
  'glennferdinan.rojas@carsu.edu.ph',
  'missividka.santillan@carsu.edu.ph',
  'samanthajezette.maestrado@carsu.edu.ph',
]

const ARTIST_EMAILS = [
  'teejay.abello@carsu.edu.ph',
  'belleblanchekyle.abiol@carsu.edu.ph',
  'jonhian.alfaras@carsu.edu.ph',
  'lendon.almocera@carsu.edu.ph',
  'robertlouis.bebis@carsu.edu.ph',
  'ryanchristianbenignos@carsu.edu.ph',
  'peterlorenzo.calo@carsu.edu.ph',
  'josefa.cruzada@carsu.edu.ph',
  'mattandrew.graban@carsu.edu.ph',
  'hannahfaith.labadan@carsu.edu.ph',
  'anne.lanzon@carsu.edu.ph',
  'gerzaallea.lim@carsu.edu.ph',
  'jhondavid.lloren@carsu.edu.ph',
  'jaylor.malnegro@carsu.edu.ph',
  'majulianny.navarez@carsu.edu.ph',
  'edwin.mori@carsu.edu.ph',
  'mhegan.niez@carsu.edu.ph',
  'kurtclyde.pablo@carsu.edu.ph',
  'jharedmiguel.paderna@carsu.edu.ph',
  'jevan.racaza@carsu.edu.ph',
  'julesleo.reserva@carsu.edu.ph', // Also Archive Manager (gets 'editor' role as highest)
]

/**
 * Determine user role ba(SYSTEM ADMIN) > editor (content admin) > section_head > member
 */
function getUserRole(email) {
  const normalizedEmail = email.toLowerCase()

  // Check roles in hierarchical order (highest to lowest)

  // 1. System Admins - access to admin panel
  if (ADMIN_EMAILS.includes(normalizedEmail)) {
    return 'admin'
  }

  // 2. Content Administrators - EIC, Technical Editor, Creative Director, Archive Managers
  if (EDITOR_EMAILS.includes(normalizedEmail)) {
    return 'editor'
  }

  // 3. Section Heads - manage their sections
  if (SECTION_HEAD_EMAILS.includes(normalizedEmail)) {
    return 'section_head'
  }

  // 4. Writers and Artists - contributors

  // Writers and Artists both get 'member' role
  if (WRITER_EMAILS.includes(normalizedEmail) || ARTIST_EMAILS.includes(normalizedEmail)) {
    return 'member'
  }

  // Default to 'member' for any other authorized users
  return 'member'
}

export async function addUserToProfiles(user) {
  try {
    if (!user || !user.email) {
      console.warn('❌ No user data provided')
      return
    }

    console.log('🔄 Checking if user exists:', user.email)

    // Check if user already exists in PROFILES table
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', user.email)
      .maybeSingle()

    console.log('🔍 Check result:', { existingUser, checkError })

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError)
      return
    }

    // ⭐ Determine user role based on their position
    const userRole = getUserRole(user.email)
    console.log(`👤 Role assigned: ${userRole}`)

    if (existingUser) {
      console.log('✅ User exists, updating last_login and role')

      // Use existing role or determine new one
      const finalRole = existingUser.role || userRole

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_active: new Date().toISOString(),
          status: 'active',
          role: finalRole, // Keep existing role or update if it was null
        })
        .eq('email', user.email)

      if (updateError) {
        console.error('❌ Error updating:', updateError)
      } else {
        console.log(`✅ Updated successfully with role: ${finalRole}`)
        // Store role and userId in localStorage
        localStorage.setItem('userRole', finalRole)
        localStorage.setItem('userId', existingUser.id)
      }
      return
    }

    console.log('🆕 Creating new user...')

    const newUser = {
      email: user.email,
      role: userRole, // Column name is 'role', not 'user_role'
      status: 'active',
      last_active: new Date().toISOString(),
    }

    console.log('📝 User to insert:', newUser)

    const { data, error } = await supabase.from('profiles').insert([newUser]).select()

    console.log('📤 Insert result:', { data, error })

    if (error) {
      console.error('❌ Insert error:', error)
      console.error('❌ Error details:', JSON.stringify(error, null, 2))
      return
    }

    console.log(`✅ User added successfully with role: ${userRole}`, data[0])
    // Store role and userId in localStorage
    localStorage.setItem('userRole', userRole)
    if (data && data[0] && data[0].id) {
      localStorage.setItem('userId', data[0].id)
    }
  } catch (err) {
    console.error('❌ Catch error:', err)
  }
}
