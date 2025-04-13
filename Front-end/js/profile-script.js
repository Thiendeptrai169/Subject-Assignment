// js/profile-script.js

function initProfilePage() {

    const studentCode = document.getElementById('profile-student-code');
    const fullName = document.getElementById('profile-full-name');
    const dob = document.getElementById('profile-dob');
    const pob = document.getElementById('profile-pob');
    const gender = document.getElementById('profile-gender');
    const idcard = document.getElementById('profile-idcard');
    const ethnicity = document.getElementById('profile-ethnicity');
    const religion = document.getElementById('profile-religion');
    const className = document.getElementById('profile-class-name');
    const country = document.getElementById('profile-country');
    const province = document.getElementById('profile-province');
    const district = document.getElementById('profile-district');
    const ward = document.getElementById('profile-ward');
    const address = document.getElementById('profile-address');
    const phone = document.getElementById('profile-phone');
    const schoolEmail = document.getElementById('profile-school-email');
    const personalEmail = document.getElementById('profile-personal-email');
    const courseYear = document.getElementById('profile-course-year'); 
    const enrollmentDate = document.getElementById('profile-enrollment-date'); 
    const trainingSystem = document.getElementById('profile-training-system'); 
    const programName = document.getElementById('profile-program-name'); 
    const facultyName = document.getElementById('profile-faculty-name');
    const majorName = document.getElementById('profile-major-name');
    const academicTerm = document.getElementById('profile-academic-term'); 
    const maxTerm = document.getElementById('profile-max-term');         
    const avatarName = document.getElementById('profile-avatar-name');
    const avatarImg = document.getElementById('profile-avatar-img');
    const currentAcademicYear = document.getElementById('current-academic-year');
    const currentSemester = document.getElementById('current-semester');
    const profileContainer = document.querySelector('#page-content .profile-container');

   
    function updateUI(profileData, semesterData) {
        if (!profileData) return;

        const setText = (element, value) => {
            if (element) {
                element.textContent = value || 'N/A'; 
            }
        };

        setText(currentAcademicYear, `${semesterData.AcademicYear} - ${semesterData.AcademicYear + 1}`);
        setText(currentSemester, `${semesterData.Semester}`);

        setText(studentCode, profileData.StudentId);
        setText(fullName, profileData.FullName);
        setText(avatarName, profileData.FullName);
        setText(dob, profileData.DateOfBirthFormatted);        
        setText(pob, profileData.PlaceOfBirth);
        setText(gender, profileData.Gender);
        setText(idcard, profileData.IdentityCardNumber);
        setText(ethnicity, profileData.Ethnicity);
        setText(religion, profileData.Religion);
        setText(phone, profileData.PhoneNumber);
        setText(schoolEmail, profileData.SchoolEmail);
        setText(personalEmail, profileData.PersonalEmail);
        setText(address, profileData.AddressDetail);
        setText(ward, profileData.Ward);
        setText(district, profileData.District);
        setText(province, profileData.Province);
        setText(country, profileData.Country);


        setText(className, profileData.ClassCode);
        setText(facultyName, profileData.FacultyName);
        setText(majorName, profileData.MajorName);
        setText(enrollmentDate, profileData.EnrollmentDateFormatted); 
        setText(trainingSystem, profileData.TrainingSystem); 
        setText(programName, profileData.ProgramName);   

    
        const enrollmentYear = profileData.EnrollmentYear; 
        const duration = profileData.ExpectedDurationYears; 
        const maxDuration = profileData.MaxDurationYears;     

        if (enrollmentYear) {
            setText(courseYear, `Khóa ${enrollmentYear}`);
            if (duration) {
                setText(academicTerm, `${enrollmentYear} - ${enrollmentYear + duration}`);
            } else {
                setText(academicTerm, `${enrollmentYear} - ?`);
            }
            if (maxDuration) {
                setText(maxTerm, `${enrollmentYear} - ${enrollmentYear + maxDuration}`);
            } else {
                setText(maxTerm, `${enrollmentYear} - ?`);
            }
        } else {
            setText(courseYear, 'N/A');
            setText(academicTerm, 'N/A');
            setText(maxTerm, 'N/A');
        }


        if (avatarImg && profileData.ProfileImageUrl) {
            avatarImg.src = profileData.ProfileImageUrl;
            avatarImg.alt = profileData.FullName || 'Avatar';
        } else if (avatarImg) {
             avatarImg.src = 'https://via.placeholder.com/150'; 
        }
    }


    async function fetchProfileData() {
        if (profileContainer) {
            profileContainer.classList.add('loading');
            profileContainer.querySelectorAll('.info-table td:last-child').forEach(td => td.textContent = 'Đang tải...'); // Cập nhật placeholder
        }

        try {
  
            const [profileResponse,semesterResponse] = await Promise.all([
                fetch('/api/profiles'),
                fetch('/api/semesters/current') 
            ]);

            let profileData = null;
            let semesterData = null;

            if (!profileResponse.ok) {
                console.error(`Profile fetch failed: ${profileResponse.status}`);
                 const errBody = await profileResponse.json().catch(() => ({}));
                 fetchError = new Error(errBody.message || `Lỗi tải profile (${profileResponse.status})`);
            } else {
                profileData = await profileResponse.json(); 
            }

           
            if (!semesterResponse.ok) {
                 console.warn(`Semester fetch failed: ${semesterResponse.status}`);
            } else {
                semesterData = await semesterResponse.json(); 
            }


            updateUI(profileData, semesterData);

        } catch (error) {
            console.error("Error fetching profile data:", error);
            if(profileContainer) {
                 const errorDiv = document.createElement('div');
                 errorDiv.innerHTML = `<p style="color: red; text-align: center; border: 1px solid red; padding: 10px; border-radius: 5px;">Lỗi tải thông tin: ${error.message}</p>`;
                 const firstChild = profileContainer.querySelector('h1');
                  if (firstChild) {
                       firstChild.parentNode.insertBefore(errorDiv, firstChild.nextSibling);
                   } else {
                      profileContainer.insertBefore(errorDiv, profileContainer.firstChild);
                   }

                  profileContainer.querySelectorAll('.info-table td:last-child').forEach(td => td.textContent = 'Lỗi');
            }
        } finally {
            if (profileContainer) profileContainer.classList.remove('loading');
        }
    }

  
    fetchProfileData();

    console.log("DEBUG: initProfilePage() finished.");
}