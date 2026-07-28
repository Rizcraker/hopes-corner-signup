import type { useVolunteerAuth } from '../hooks/useVolunteerAuth'
import type { useUserInfo } from '../hooks/useUserInfo'
import type { useShifts } from '../hooks/useShifts'
import AuthPanel from '../components/volunteer/AuthPanel'
import VolunteerDashboard from '../components/volunteer/VolunteerDashboard'

// The three hooks are called in App and their results passed in here as props. They must NOT be
// called inside this component: it is a route element, so it unmounts whenever you navigate away,
// which would wipe the session, the in-progress registration form and the shift browser state.
interface VolunteerPageProps {
  auth: ReturnType<typeof useVolunteerAuth>
  userInfoApi: ReturnType<typeof useUserInfo>
  shiftsApi: ReturnType<typeof useShifts>
}

function VolunteerPage({ auth, userInfoApi, shiftsApi }: VolunteerPageProps) {
  return (
    <div className="tab-fade-in">
      <div className="portal-header-box">
        <h2>Hope's Corner Volunteering Hub</h2>
        <p>Join hands with our community. Sign up for active operations, food service duties, and support shifts below.</p>
      </div>

      {!auth.userSession ? (
        <AuthPanel
          isSignUp={auth.isSignUp}
          setIsSignUp={auth.setIsSignUp}
          email={auth.email}
          setEmail={auth.setEmail}
          password={auth.password}
          setPassword={auth.setPassword}
          showPassword={auth.showPassword}
          setShowPassword={auth.setShowPassword}
          errorMessage={auth.errorMessage}
          setErrorMessage={auth.setErrorMessage}
          infoMessage={auth.infoMessage}
          setInfoMessage={auth.setInfoMessage}
          authLoading={auth.authLoading}
          registrationStep={auth.registrationStep}
          setRegistrationStep={auth.setRegistrationStep}
          firstName={auth.firstName}
          setFirstName={auth.setFirstName}
          lastName={auth.lastName}
          setLastName={auth.setLastName}
          birthday={auth.birthday}
          setBirthday={auth.setBirthday}
          phoneNumber={auth.phoneNumber}
          setPhoneNumber={auth.setPhoneNumber}
          emergencyContactName={auth.emergencyContactName}
          setEmergencyContactName={auth.setEmergencyContactName}
          emergencyContactPhone={auth.emergencyContactPhone}
          setEmergencyContactPhone={auth.setEmergencyContactPhone}
          employer={auth.employer}
          setEmployer={auth.setEmployer}
          streetAddress={auth.streetAddress}
          setStreetAddress={auth.setStreetAddress}
          city={auth.city}
          setCity={auth.setCity}
          zipCode={auth.zipCode}
          setZipCode={auth.setZipCode}
          organization={auth.organization}
          setOrganization={auth.setOrganization}
          customGroup={auth.customGroup}
          setCustomGroup={auth.setCustomGroup}
          groupOptions={auth.groupOptions}
          resetProfileFields={auth.resetProfileFields}
          handleAuthSubmit={auth.handleAuthSubmit}
        />
      ) : (
        <VolunteerDashboard
          getUserName={auth.getUserName}
          userInfo={userInfoApi.userInfo}
          removeActiveShift={userInfoApi.removeActiveShift}
          updateProfile={userInfoApi.updateProfile}
          handleSignOut={auth.handleSignOut}
          shifts={shiftsApi.shifts}
          loading={shiftsApi.loading}
          errorMessage={auth.errorMessage}
          onRefresh={shiftsApi.handleRefreshShifts}
          isRefreshSpinning={shiftsApi.isRefreshSpinning}
          sortMode={shiftsApi.sortMode}
          setSortMode={shiftsApi.setSortMode}
          expandedJobs={shiftsApi.expandedJobs}
          toggleJobGroup={shiftsApi.toggleJobGroup}
          expandedDateKeys={shiftsApi.expandedDateKeys}
          toggleDateEntry={shiftsApi.toggleDateEntry}
          selectedCalendarDay={shiftsApi.selectedCalendarDay}
          setSelectedCalendarDay={shiftsApi.setSelectedCalendarDay}
          shiftsByJob={shiftsApi.shiftsByJob}
          jobGroupNames={shiftsApi.jobGroupNames}
          shiftsByDate={shiftsApi.shiftsByDate}
          shiftsByMonth={shiftsApi.shiftsByMonth}
          onSignUp={userInfoApi.updateActiveShifts}
        />
      )}
    </div>
  )
}

export default VolunteerPage
