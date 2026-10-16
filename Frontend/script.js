document.addEventListener('DOMContentLoaded', () => {
    // Scroll Progress Bar Logic
    const scrollProgress = document.getElementById('scroll-progress');
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercentage = (scrollTop / scrollHeight) * 100;
        if (scrollProgress) {
            scrollProgress.style.width = scrollPercentage + '%';
        }
    });

    // Tab Switching Logic
    const navItems = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all tabs
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab
            item.classList.add('active');

            // Show corresponding content
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // File Upload Drag & Drop Logic
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const browseBtn = dropZone ? dropZone.querySelector('.btn-outline') : null;
    

    if (browseBtn && fileInput && dropZone) {
        browseBtn.addEventListener('click', () => {
            fileInput.click();
        });

        fileInput.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
    }

    function handleFiles(files) {
        if (files.length > 0) {
            const fileName = files[0].name;
            dropZone.querySelector('h3').textContent = fileName;
            dropZone.querySelector('p').textContent = 'File ready for analysis';
            dropZone.querySelector('.upload-icon').textContent = '✅';
            dropZone.style.borderColor = 'var(--success)';
            dropZone.style.color = 'var(--success)';
        }
    }

    // Button Click Interactions (Feedback)
    const primaryBtns = document.querySelectorAll('.btn-primary');
    primaryBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const originalText = this.textContent;
            this.textContent = 'Processing...';
            this.style.opacity = '0.8';
            this.disabled = true;

            setTimeout(() => {
                this.textContent = 'Analysis Complete!';
                this.style.background = 'var(--success)';

                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.opacity = '1';
                    this.disabled = false;
                    this.style.background = 'var(--primary-gradient)';
                }, 2000);
            }, 1500);
        });
    });

    // Enhanced Auth UI Logic (Dropdown & Logout)
    const userProfile = document.getElementById('user-profile');
    const profileDropdown = document.getElementById('profile-dropdown');
    const logoutBtn = document.getElementById('logout-btn');

    if (userProfile) {
        // Toggle Dropdown
        userProfile.addEventListener('click', (e) => {
            e.stopPropagation();
            if (profileDropdown) {
                profileDropdown.style.display = profileDropdown.style.display === 'none' ? 'block' : 'none';
            }
        });

        // Close dropdown when clicking anywhere else
        document.addEventListener('click', () => {
            
            if (profileDropdown) profileDropdown.style.display = 'none';
        });

        // Keep dropdown open when clicking inside it
        if (profileDropdown) {
            profileDropdown.addEventListener('click', (e) => e.stopPropagation());
        }

        // Handle strict logout mapping
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                logout();
            });
        }
    }

    // Skill Gap Analyzer Logic
    const analyzeGapBtn = document.getElementById('analyze-gap-btn');
    const skillGapResults = document.getElementById('skill-gap-results');
    const targetRoleInput = document.getElementById('target-role');
    const skillDropZone = document.getElementById('skill-drop-zone');
    const skillFileInput = document.getElementById('skill-file-input');

    if (skillDropZone && skillFileInput) {
        const skillBrowseBtn = skillDropZone.querySelector('.btn-outline');
        if (skillBrowseBtn) {
            skillBrowseBtn.addEventListener('click', () => skillFileInput.click());
        }

        skillFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                document.getElementById('skill-upload-title').textContent = e.target.files[0].name;
                document.getElementById('skill-upload-desc').textContent = 'Skill profile loaded';
                skillDropZone.querySelector('.upload-icon').textContent = '✅';
                skillDropZone.style.borderColor = 'var(--success)';
                skillDropZone.style.color = 'var(--success)';
            }
        });
    }

    if (analyzeGapBtn && skillGapResults) {
        analyzeGapBtn.addEventListener('click', async () => {
            // Validation
            const skillUploadTitle = document.getElementById('skill-upload-title');
            if (skillUploadTitle && skillUploadTitle.textContent.includes('Upload Resume')) {
                alert('Please upload your resume to analyze skill gaps.');
                return;
            }
            if (targetRoleInput && !targetRoleInput.value.trim()) {
                alert('Please specify your target role.');
                return;
            }

            const originalText = analyzeGapBtn.textContent;
            analyzeGapBtn.textContent = '🧠 Analyzing Skills & Finding Videos...';
            analyzeGapBtn.disabled = true;
            analyzeGapBtn.style.background = '#6366f1';

            try {
                const formData = new FormData();
                formData.append('resume', skillFileInput.files[0]);
                formData.append('target_role', targetRoleInput.value);

                const response = await fetch('http://127.0.0.1:5000/api/skill-gap', {
                    method: "POST",
                    body: formData
                });
                const data = await response.json();

                analyzeGapBtn.textContent = originalText;
                analyzeGapBtn.disabled = false;
                analyzeGapBtn.style.background = '';

                if (data.success) {
                    // Update target role highlight
                    const roleSpan = skillGapResults.querySelector('.highlight');
                    if (roleSpan) roleSpan.textContent = targetRoleInput.value;

                    // Populate Missing Skill Tags
                    const tagsContainer = document.getElementById('skill-gap-tags-container');
                    if (tagsContainer) {
                        tagsContainer.innerHTML = '';
                        if (data.missing_skills.length === 0) {
                            tagsContainer.innerHTML = '<span class="gap-tag" style="background:var(--success);color:#fff">Great! You have all required skills!</span>';
                        } else {
                            data.missing_skills.forEach(skill => {
                                const span = document.createElement('span');
                                span.className = 'gap-tag';
                                span.textContent = skill;
                                tagsContainer.appendChild(span);
                            });
                        }
                    }

                    // Populate YouTube Videos dynamically
                    const videosContainer = document.getElementById('youtube-videos-container');
                    if (videosContainer) {
                        videosContainer.innerHTML = '';

                        if (!data.recommendations || data.recommendations.length === 0) {
                            videosContainer.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">No learning resources needed right now!</p>';
                        } else {
                            data.recommendations.forEach(rec => {
                                const v = rec.video;
                                const videoHTML = `
                                    <a href="${v.url}" target="_blank" class="video-card">
                                        <div class="video-thumb" style="background-image: url('${v.thumbnail}'); background-size: cover; background-position: center;">
                                            <span class="play-icon">▶</span>
                                            <div class="thumb-overlay"></div>
                                            <span class="duration">Learn ${rec.skill}</span>
                                        </div>
                                        <div class="video-info">
                                            <h5>${v.title}</h5>
                                            <p><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2C5.12 19.5 12 19.5 12 19.5s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg> ${v.channel}</p>
                                        </div>
                                    </a>
                                `;
                                videosContainer.innerHTML += videoHTML;
                            });
                        }
                    }

                    skillGapResults.classList.remove('hidden');
                    setTimeout(() => {
                        skillGapResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (e) {
                console.error(e);
                alert("Connection Error. Ensure the Python Server is running.");
                analyzeGapBtn.textContent = originalText;
                analyzeGapBtn.disabled = false;
                analyzeGapBtn.style.background = '';
            }
        });
    }

    // Eligible Roles (Job Matcher) Logic
    const findRolesBtn = document.getElementById('find-roles-btn');
    const eligibleRolesResults = document.getElementById('eligible-roles-results');
    const jobDropZone = document.getElementById('job-drop-zone');
    const jobFileInput = document.getElementById('job-file-input');

    if (jobDropZone && jobFileInput) {
        const jobBrowseBtn = jobDropZone.querySelector('.btn-outline');
        if (jobBrowseBtn) {
            jobBrowseBtn.addEventListener('click', () => jobFileInput.click());
        }

        jobFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                document.getElementById('job-upload-title').textContent = e.target.files[0].name;
                document.getElementById('job-upload-desc').textContent = 'Resume ready for role prediction';
                jobDropZone.querySelector('.upload-icon').textContent = '✅';
                jobDropZone.style.borderColor = 'var(--success)';
                jobDropZone.style.color = 'var(--success)';
            }
        });
    }

    if (findRolesBtn && eligibleRolesResults) {
        findRolesBtn.addEventListener('click', async () => {
            const jobUploadTitle = document.getElementById('job-upload-title');
            if (jobUploadTitle && jobUploadTitle.textContent.includes('Upload Resume')) {
                alert('Please upload your resume to predict eligible roles.');
                return;
            }

            const originalText = findRolesBtn.textContent;
            findRolesBtn.textContent = '🧠 AI is evaluating your profile...';
            findRolesBtn.disabled = true;
            findRolesBtn.style.background = '#6366f1';

            try {
                const formData = new FormData();
                formData.append('resume', jobFileInput.files[0]);

                const response = await fetch('http://127.0.0.1:5000/api/predict-roles', {
                    method: "POST",
                    body: formData
                });
                const data = await response.json();

                findRolesBtn.textContent = originalText;
                findRolesBtn.disabled = false;
                findRolesBtn.style.background = '';

                if (data.success) {
                    const listContainer = eligibleRolesResults.querySelector('.job-list');
                    if (listContainer) {
                        listContainer.innerHTML = '';
                        data.roles.forEach(role => {
                            let tagsHtml = '';
                            if (role.tags) {
                                role.tags.forEach(tag => {
                                    tagsHtml += `<span>${tag}</span>`;
                                });
                            }

                            // Determine color based on match percentage dynamically
                            let badgeColor = 'var(--success)';
                            let badgeBg = 'rgba(16, 185, 129, 0.2)';
                            if (role.match_percentage < 75) {
                                badgeColor = 'var(--warning)';
                                badgeBg = 'rgba(245, 158, 11, 0.2)';
                            }

                            const cardHtml = `
                                <div class="job-card" style="display: flex; flex-direction: column; gap: 1rem;">
                                    <div class="job-header" style="margin-bottom: 0">
                                        <div>
                                            <h3 style="color: #fb923c">${role.role}</h3>
                                            <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.3rem;">
                                                <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
                                                    ${role.match_percentage}% AI Confidence
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="ai-explanation" style="background: rgba(139, 92, 246, 0.05); border-left: 3px solid var(--primary); padding: 1rem; border-radius: 0 8px 8px 0; font-size: 0.9rem; line-height: 1.5; color: var(--text-secondary);">
                                        <strong style="color: var(--primary); display: block; margin-bottom: 0.3rem; font-size: 0.85rem;"><span style="margin-right:0.3rem">✨</span>Groq AI Reasoning</strong>
                                        ${role.reasoning}
                                    </div>

                                    <div class="job-tags" style="margin-top: 0.5rem; margin-bottom: 0">
                                        ${tagsHtml}
                                    </div>
                                </div>
                            `;
                            listContainer.innerHTML += cardHtml;
                        });
                    }
                    eligibleRolesResults.classList.remove('hidden');
                    setTimeout(() => {
                        eligibleRolesResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (e) {
                console.error(e);
                alert("Connection Error. Ensure the Python Server is running.");
                findRolesBtn.textContent = originalText;
                findRolesBtn.disabled = false;
                findRolesBtn.style.background = '';
            }
        });
    }

    // Resume Matcher Logic
    const analyzeResumeBtn = document.getElementById('analyze-resume-btn');
    const resumeResults = document.getElementById('resume-results');
    const resumeDropZoneTitle = document.querySelector('#drop-zone h3');
    const jdTextarea = document.querySelector('#resume-matcher textarea');

    if (analyzeResumeBtn && resumeResults) {
        analyzeResumeBtn.addEventListener('click', async () => {
            // Validation
            if (resumeDropZoneTitle && resumeDropZoneTitle.textContent.includes('Drag & Drop')) {
                alert('Please upload/browse to attach your resume file first!');
                return;
            }
            if (jdTextarea && !jdTextarea.value.trim()) {
                alert('Please paste a target Job Description to analyze against.');
                return;
            }

            const originalText = analyzeResumeBtn.textContent;
            analyzeResumeBtn.textContent = '🧠 AI Analyzing Match...';
            analyzeResumeBtn.disabled = true;
            analyzeResumeBtn.style.background = '#6366f1';

            try {
                // Prepare API payload with file data
                const formData = new FormData();
                const fileInput = document.getElementById('file-input');
                formData.append('resume', fileInput.files[0]);
                formData.append('job_description', jdTextarea.value);

                // Hit Python Flask Backend
                const response = await fetch('http://127.0.0.1:5000/api/analyze', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                // Reset Button
                analyzeResumeBtn.textContent = originalText;
                analyzeResumeBtn.disabled = false;
                analyzeResumeBtn.style.background = '';

                if (data.success) {
                    const percentage = data.match_percentage;
                    const foundSkills = data.found_skills;
                    const missingSkills = data.missing_skills;

                    // Targeted DOM manipulation
                    const matchCircle = document.getElementById('match-circle-path');
                    const matchText = document.getElementById('match-percentage-text');
                    const foundContainer = document.getElementById('found-skills-container');
                    const missingContainer = document.getElementById('missing-skills-container');

                    if (matchCircle && matchText) {
                        // Update graph visually
                        matchCircle.setAttribute('stroke-dasharray', `${percentage}, 100`);
                        matchText.textContent = `${percentage}%`;

                        // Graph colors based on match
                        let color = 'var(--success)';
                        let feedback = 'Great Match!';
                        if (percentage < 75) { color = 'var(--warning)'; feedback = 'Good Match'; }
                        if (percentage < 55) { color = '#ef4444'; feedback = 'Needs Improvement'; }

                        matchCircle.style.stroke = color;
                        matchText.style.color = color;
                        const feedbackTitle = matchText.parentElement.nextElementSibling.querySelector('h4');
                        if (feedbackTitle) {
                            feedbackTitle.textContent = feedback;
                            feedbackTitle.style.color = color;
                        }
                    }

                    if (foundContainer) {
                        foundContainer.innerHTML = ''; // clear original
                        foundSkills.forEach(s => {
                            const span = document.createElement('span');
                            span.className = 'gap-tag';
                            span.style.background = 'rgba(16, 185, 129, 0.2)';
                            span.style.color = '#fff';
                            span.style.border = '1px solid rgba(16,185,129,0.3)';
                            span.style.textTransform = 'capitalize';
                            span.textContent = s;
                            foundContainer.appendChild(span);
                        });
                    }

                    if (missingContainer) {
                        missingContainer.innerHTML = ''; // clear original
                        missingSkills.forEach(s => {
                            const span = document.createElement('span');
                            span.className = 'gap-tag';
                            span.style.textTransform = 'capitalize';
                            span.textContent = s;
                            missingContainer.appendChild(span);
                        });
                    }

                    // Uncover the results UI smoothly
                    resumeResults.classList.remove('hidden');
                    setTimeout(() => {
                        resumeResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (error) {
                console.error(error);
                alert("Connection Error. Ensure your Python Flask server is running on port 5000!");
                analyzeResumeBtn.textContent = originalText;
                analyzeResumeBtn.disabled = false;
                analyzeResumeBtn.style.background = '';
            }
        });
    }
});
