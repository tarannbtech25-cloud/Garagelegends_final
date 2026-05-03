document.addEventListener('DOMContentLoaded', async () => {

    // ══════════════════════════════════════════════════════════════
    // 1. Video Background — Mobile Fallback & Performance
    // ══════════════════════════════════════════════════════════════
    const videoBg = document.getElementById('videoBg');
    const videoFallback = document.getElementById('videoFallback');
    const isMobile = window.matchMedia('(max-width: 768px)').matches
        || /Android|iPhone|iPad|iPod|Opera Mini/i.test(navigator.userAgent);

    if (videoBg) {
        if (isMobile) {
            // Completely remove the video element to save memory & bandwidth
            videoBg.pause();
            videoBg.removeAttribute('src');
            videoBg.removeAttribute('poster');
            // Remove all <source> children
            videoBg.querySelectorAll('source').forEach(s => s.remove());
            videoBg.load(); // Reset the media element
            videoBg.style.display = 'none';
            if (videoFallback) videoFallback.style.display = 'block';
        } else {
            // Desktop: Inject the real video source from data-src
            const source = videoBg.querySelector('source[data-src]');
            if (source) {
                source.src = source.getAttribute('data-src');
                source.removeAttribute('data-src');
                videoBg.load();
                videoBg.play().catch(() => {
                    // If autoplay blocked, show fallback
                    videoBg.style.display = 'none';
                    if (videoFallback) videoFallback.style.display = 'block';
                });
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    // 2. Sticky Navbar — Blur on Scroll
    // ══════════════════════════════════════════════════════════════
    const navbar = document.getElementById('navbar');
    if (navbar) {
        let lastScroll = 0;
        const scrollThreshold = 60;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;

            if (currentScroll > scrollThreshold) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            lastScroll = currentScroll;
        }, { passive: true });
    }

    // ══════════════════════════════════════════════════════════════
    // 3. Intersection Observer — Reveal Animations (staggered)
    // ══════════════════════════════════════════════════════════════
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Once revealed, stop observing for performance
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.08,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ══════════════════════════════════════════════════════════════
    // 4. 3D Tilt Effect on Glass Cards
    // ══════════════════════════════════════════════════════════════
    if (!isMobile) {
        document.querySelectorAll('.glass-card').forEach(card => {
            const content = card.querySelector('.glass-content');
            if (!content) return;

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -6;
                const rotateY = ((x - centerX) / centerX) * 6;

                content.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                content.style.transition = 'transform 0.08s ease-out';
            });

            card.addEventListener('mouseleave', () => {
                content.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg)`;
                content.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            });
        });
    }

    // ══════════════════════════════════════════════════════════════
    // 5. Smooth Scroll for Anchor Links
    // ══════════════════════════════════════════════════════════════
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ══════════════════════════════════════════════════════════════
    // 6. Auth State — Check /api/me on every page load
    // ══════════════════════════════════════════════════════════════
    let currentUser = null;

    async function checkAuth() {
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            if (data.loggedIn) {
                currentUser = data.user;
                updateNavbar(true);
            } else {
                currentUser = null;
                updateNavbar(false);
            }
        } catch {
            currentUser = null;
            updateNavbar(false);
        }
    }

    function updateNavbar(loggedIn) {
        const navAuth = document.getElementById('navAuth');
        const navBookings = document.getElementById('navBookings');

        if (!navAuth) return;

        if (loggedIn && currentUser) {
            navAuth.innerHTML = `
                <div class="nav-user-info">
                    <span class="nav-username">${currentUser.username}</span>
                    ${currentUser.role === 'admin' ? '<a href="admin.html" class="btn-nav" style="margin-right:1rem; color:var(--accent); text-decoration:none;">Admin Panel</a>' : ''}
                    <button class="btn-logout" onclick="doLogout()">Logout</button>
                </div>
            `;
            if (navBookings) navBookings.classList.remove('hidden');
        } else {
            navAuth.innerHTML = `
                <a href="login.html" class="btn-nav btn-nav-outline">Log In</a>
                <a href="signup.html" class="btn-nav btn-nav-filled">Sign Up</a>
            `;
            if (navBookings) navBookings.classList.add('hidden');
        }

    }

    // Global logout function
    window.doLogout = async function () {
        await fetch('/api/logout', { method: 'POST' });
        currentUser = null;
        updateNavbar(false);
        window.location.href = 'index.html';
    };

    await checkAuth();

    // ══════════════════════════════════════════════════════════════
    // 7. Signup Form
    // ══════════════════════════════════════════════════════════════
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('signupBtn');
            const status = document.getElementById('signupStatus');
            const password = document.getElementById('signupPassword').value;
            const confirm = document.getElementById('signupConfirm').value;

            if (password !== confirm) {
                status.style.color = '#ff5252';
                status.textContent = '❌ Passwords do not match.';
                return;
            }

            btn.disabled = true;
            btn.textContent = 'Creating...';
            status.textContent = '';

            try {
                const res = await fetch('/api/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: document.getElementById('signupUsername').value.trim(),
                        email: document.getElementById('signupEmail').value.trim(),
                        password
                    })
                });
                const data = await res.json();

                if (data.success) {
                    status.style.color = '#00e676';
                    status.textContent = '✅ ' + data.message;
                    setTimeout(() => window.location.href = 'index.html', 1000);
                } else {
                    status.style.color = '#ff5252';
                    status.textContent = '❌ ' + data.error;
                }
            } catch {
                status.style.color = '#ff5252';
                status.textContent = '❌ Could not reach the server.';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    // 8. Login Form
    // ══════════════════════════════════════════════════════════════
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            const status = document.getElementById('loginStatus');

            btn.disabled = true;
            btn.textContent = 'Authenticating...';
            status.textContent = '';

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: document.getElementById('loginEmail').value.trim(),
                        password: document.getElementById('loginPassword').value
                    })
                });
                const data = await res.json();

                if (data.success) {
                    status.style.color = '#00e676';
                    status.textContent = '✅ ' + data.message;
                    setTimeout(() => window.location.href = 'index.html', 800);
                } else {
                    status.style.color = '#ff5252';
                    status.textContent = '❌ ' + data.error;
                }
            } catch {
                status.style.color = '#ff5252';
                status.textContent = '❌ Could not reach the server.';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Engage';
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    // 9. Contact Form (with auto-fill for logged in users)
    // ══════════════════════════════════════════════════════════════
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        // Auto-fill if logged in
        if (currentUser) {
            const nameField = document.getElementById('fullName');
            const emailField = document.getElementById('email');
            if (nameField && !nameField.value) nameField.value = currentUser.username;
            if (emailField && !emailField.value) emailField.value = currentUser.email;
        }

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitBtn');
            const statusDiv = document.getElementById('formStatus');

            const formData = {
                full_name: document.getElementById('fullName').value.trim(),
                email: document.getElementById('email').value.trim(),
                model_interest: document.getElementById('modelInterest').value,
                message: document.getElementById('message').value.trim()
            };

            submitBtn.disabled = true;
            submitBtn.textContent = 'Transmitting...';
            statusDiv.textContent = '';

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                if (result.success) {
                    statusDiv.style.color = '#00e676';
                    statusDiv.textContent = '✅ ' + result.message;
                    contactForm.reset();
                } else {
                    statusDiv.style.color = '#ff5252';
                    statusDiv.textContent = '❌ ' + (result.error || 'Submission failed.');
                }
            } catch {
                statusDiv.style.color = '#ff5252';
                statusDiv.textContent = '❌ Could not reach the server. Is it running?';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Ignite Sequence';
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    // 10. Vehicle Detail Pages — Booking + Reviews
    // ══════════════════════════════════════════════════════════════
    const bookingSection = document.querySelector('.booking-section');
    const reviewsSection = document.querySelector('.reviews-section');

    if (bookingSection || reviewsSection) {
        const pageName = (bookingSection || reviewsSection).getAttribute('data-page');
        let vehicleData = null;

        // Fetch vehicle info by page name
        try {
            const res = await fetch(`/api/vehicles/by-page/${pageName}`);
            const data = await res.json();
            if (data.success) vehicleData = data.data;
        } catch { }

        // ── Booking Form ──
        if (bookingSection && vehicleData) {
            const bookingArea = document.getElementById('bookingArea');
            if (currentUser) {
                bookingArea.innerHTML = `
                    <div class="booking-form-card">
                        <form id="bookingForm">
                            <div class="booking-form-row">
                                <div class="form-group">
                                    <label for="bookDate">Preferred Date</label>
                                    <input type="date" id="bookDate" required min="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="form-group">
                                    <label for="bookTime">Preferred Time</label>
                                    <select id="bookTime" required>
                                        <option value="">Select a slot</option>
                                        <option>09:00 AM</option>
                                        <option>10:00 AM</option>
                                        <option>11:00 AM</option>
                                        <option>12:00 PM</option>
                                        <option>02:00 PM</option>
                                        <option>03:00 PM</option>
                                        <option>04:00 PM</option>
                                        <option>05:00 PM</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label for="bookNotes">Additional Notes (optional)</label>
                                <textarea id="bookNotes" rows="3" placeholder="Any special requests?"></textarea>
                            </div>
                            <button type="submit" class="btn-primary" style="width:100%;">Confirm Booking</button>
                            <div id="bookingStatus" class="form-status"></div>
                        </form>
                    </div>
                `;

                document.getElementById('bookingForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const status = document.getElementById('bookingStatus');

                    try {
                        const res = await fetch('/api/bookings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                vehicle_id: vehicleData.id,
                                preferred_date: document.getElementById('bookDate').value,
                                preferred_time: document.getElementById('bookTime').value,
                                notes: document.getElementById('bookNotes').value.trim()
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            status.style.color = '#00e676';
                            status.textContent = '✅ ' + data.message;
                            document.getElementById('bookingForm').reset();
                        } else {
                            status.style.color = '#ff5252';
                            status.textContent = '❌ ' + data.error;
                        }
                    } catch {
                        status.style.color = '#ff5252';
                        status.textContent = '❌ Could not reach server.';
                    }
                });
            } else {
                bookingArea.innerHTML = `
                    <div class="login-prompt">
                        <p>🔒 <a href="login.html">Log in</a> or <a href="signup.html">Sign up</a> to book a test drive.</p>
                    </div>
                `;
            }
        }

        // ── Reviews ──
        if (reviewsSection && vehicleData) {
            const reviewFormArea = document.getElementById('reviewFormArea');
            const reviewsList = document.getElementById('reviewsList');

            // Review form (only for logged-in users)
            if (currentUser) {
                let selectedRating = 0;
                reviewFormArea.innerHTML = `
                    <div class="review-form-card">
                        <h3>Share Your Experience</h3>
                        <div class="star-rating-input" id="starInput">
                            <button type="button" class="star-btn" data-star="1">★</button>
                            <button type="button" class="star-btn" data-star="2">★</button>
                            <button type="button" class="star-btn" data-star="3">★</button>
                            <button type="button" class="star-btn" data-star="4">★</button>
                            <button type="button" class="star-btn" data-star="5">★</button>
                        </div>
                        <div class="form-group">
                            <textarea id="reviewText" rows="3" placeholder="Write your review..."></textarea>
                        </div>
                        <button type="button" id="submitReview" class="btn-primary" style="width:100%;">Submit Review</button>
                        <div id="reviewStatus" class="form-status"></div>
                    </div>
                `;

                // Star clicking
                document.querySelectorAll('#starInput .star-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        selectedRating = parseInt(btn.getAttribute('data-star'));
                        document.querySelectorAll('#starInput .star-btn').forEach((s, i) => {
                            s.classList.toggle('active', i < selectedRating);
                        });
                    });
                });

                document.getElementById('submitReview').addEventListener('click', async () => {
                    const status = document.getElementById('reviewStatus');
                    if (selectedRating === 0) {
                        status.style.color = '#ff5252';
                        status.textContent = '❌ Please select a star rating.';
                        return;
                    }

                    try {
                        const res = await fetch('/api/reviews', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                vehicle_id: vehicleData.id,
                                rating: selectedRating,
                                review_text: document.getElementById('reviewText').value.trim()
                            })
                        });
                        const data = await res.json();
                        if (data.success) {
                            status.style.color = '#00e676';
                            status.textContent = '✅ ' + data.message;
                            selectedRating = 0;
                            document.getElementById('reviewText').value = '';
                            document.querySelectorAll('#starInput .star-btn').forEach(s => s.classList.remove('active'));
                            loadReviews();
                        } else {
                            status.style.color = '#ff5252';
                            status.textContent = '❌ ' + data.error;
                        }
                    } catch {
                        status.style.color = '#ff5252';
                        status.textContent = '❌ Could not reach server.';
                    }
                });
            }

            // Load reviews
            async function loadReviews() {
                try {
                    const res = await fetch(`/api/reviews/${vehicleData.id}`);
                    const data = await res.json();
                    if (data.success && data.data.length > 0) {
                        reviewsList.innerHTML = data.data.map(r => `
                            <div class="review-card">
                                <div class="review-header">
                                    <div class="review-user">
                                        <div class="review-avatar">${r.username.charAt(0)}</div>
                                        <div>
                                            <div class="review-username">${r.username}</div>
                                            <div class="review-date">${new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    <div class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                                </div>
                                ${r.review_text ? `<p class="review-text">${r.review_text}</p>` : ''}
                            </div>
                        `).join('');
                    } else {
                        reviewsList.innerHTML = '<div class="no-reviews">No reviews yet. Be the first to share your experience!</div>';
                    }
                } catch {
                    reviewsList.innerHTML = '<div class="no-reviews">Could not load reviews.</div>';
                }
            }

            loadReviews();

        }
    }

    // ══════════════════════════════════════════════════════════════
    // 11. My Bookings Page
    // ══════════════════════════════════════════════════════════════
    const bookingsContainer = document.getElementById('bookingsContainer');
    const emptyBookings = document.getElementById('emptyBookings');

    if (bookingsContainer) {
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        async function loadBookings() {
            try {
                const res = await fetch('/api/bookings');
                const data = await res.json();

                if (data.success && data.data.length > 0) {
                    emptyBookings.classList.add('hidden');
                    bookingsContainer.innerHTML = data.data.map(b => `
                        <div class="booking-card">
                            <img class="booking-card-img" src="${b.image_filename}" alt="${b.vehicle_name}">
                            <div class="booking-card-body">
                                <h3>${b.vehicle_name}</h3>
                                <span class="status-badge status-${b.status}">${b.status}</span>
                                <div class="booking-meta">
                                    <div class="booking-meta-item">
                                        <span class="label">Date</span>
                                        <span class="value">${new Date(b.preferred_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <div class="booking-meta-item">
                                        <span class="label">Time</span>
                                        <span class="value">${b.preferred_time}</span>
                                    </div>
                                    <div class="booking-meta-item">
                                        <span class="label">Type</span>
                                        <span class="value" style="text-transform:capitalize;">${b.category}</span>
                                    </div>
                                    ${b.notes ? `<div class="booking-meta-item"><span class="label">Notes</span><span class="value">${b.notes}</span></div>` : ''}
                                </div>
                                ${b.status === 'pending' ? `
                                    <div class="booking-actions">
                                        <button class="btn-cancel-booking" onclick="cancelBooking(${b.id})">Cancel</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `).join('');
                } else {
                    bookingsContainer.innerHTML = '';
                    emptyBookings.classList.remove('hidden');
                }

            } catch {
                bookingsContainer.innerHTML = '<p style="color:#ff5252;text-align:center;">Failed to load bookings.</p>';
            }
        }

        window.cancelBooking = async function (id) {
            if (!confirm('Cancel this booking?')) return;
            try {
                await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
                loadBookings();
            } catch { }
        };

        loadBookings();
    }

    // ══════════════════════════════════════════════════════════════
    // 12. Admin Page
    // ══════════════════════════════════════════════════════════════
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminDashboard = document.getElementById('adminDashboard');
    const adminLoginGate = document.getElementById('adminLoginGate');

    if (adminLoginForm) {
        // Check if already admin
        if (currentUser && currentUser.role === 'admin') {
            showAdminDashboard();
        }

        adminLoginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const status = document.getElementById('adminLoginStatus');

            try {
                const res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: document.getElementById('adminEmail').value.trim(),
                        password: document.getElementById('adminPassword').value
                    })
                });
                const data = await res.json();

                if (data.success) {
                    status.style.color = '#00e676';
                    status.textContent = '✅ Access granted.';
                    setTimeout(() => showAdminDashboard(), 500);
                } else {
                    status.style.color = '#ff5252';
                    status.textContent = '❌ ' + data.error;
                }
            } catch {
                status.style.color = '#ff5252';
                status.textContent = '❌ Could not reach server.';
            }
        });

        // Admin Tabs
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
            });
        });
    }

    async function showAdminDashboard() {
        if (adminLoginGate) adminLoginGate.style.display = 'none';
        if (adminDashboard) adminDashboard.classList.add('visible');

        // Load stats
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (data.success) {
                document.getElementById('statUsers').textContent = data.data.totalUsers;
                document.getElementById('statBookings').textContent = data.data.totalBookings;
                document.getElementById('statContacts').textContent = data.data.totalContacts;
                document.getElementById('statReviews').textContent = data.data.totalReviews;
                document.getElementById('statPending').textContent = data.data.pendingBookings;
            }
        } catch { }

        // Load bookings
        try {
            const res = await fetch('/api/admin/bookings');
            const data = await res.json();
            document.getElementById('adminBookingsBody').innerHTML = data.data.map(b => `
                <tr>
                    <td>${b.id}</td>
                    <td>${b.username}</td>
                    <td>${b.vehicle_name} <span style="color:var(--text-muted);font-size:0.8rem;">(${b.category})</span></td>
                    <td>${new Date(b.preferred_date).toLocaleDateString('en-IN')}</td>
                    <td>${b.preferred_time}</td>
                    <td><span class="status-badge status-${b.status}">${b.status}</span></td>
                    <td>
                        ${b.status === 'pending' ? `
                            <button class="action-btn confirm" onclick="adminUpdateBooking(${b.id},'confirmed')">Confirm</button>
                            <button class="action-btn cancel" onclick="adminUpdateBooking(${b.id},'cancelled')">Cancel</button>
                        ` : '—'}
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No bookings yet.</td></tr>';
        } catch { }

        // Load contacts
        try {
            const res = await fetch('/api/contacts');
            const data = await res.json();
            document.getElementById('adminContactsBody').innerHTML = data.data.map(c => `
                <tr>
                    <td>${c.id}</td>
                    <td>${c.full_name}</td>
                    <td>${c.email}</td>
                    <td>${c.model_interest}</td>
                    <td style="max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.message}</td>
                    <td>${c.submitted_by || '—'}</td>
                    <td>${new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
            `).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);">No messages yet.</td></tr>';
        } catch { }

        // Load reviews
        try {
            const res = await fetch('/api/admin/reviews');
            const data = await res.json();
            document.getElementById('adminReviewsBody').innerHTML = data.data.map(r => `
                <tr>
                    <td>${r.id}</td>
                    <td>${r.username}</td>
                    <td>${r.vehicle_name}</td>
                    <td style="color:#ffab00;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</td>
                    <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.review_text || '—'}</td>
                    <td>${new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No reviews yet.</td></tr>';
        } catch { }

        // Load users
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            document.getElementById('adminUsersBody').innerHTML = data.data.map(u => `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.username}</td>
                    <td>${u.email}</td>
                    <td><span class="status-badge ${u.role === 'admin' ? 'status-confirmed' : 'status-pending'}">${u.role}</span></td>
                    <td>${u.booking_count}</td>
                    <td>${u.review_count}</td>
                    <td>${new Date(u.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
            `).join('');
        } catch { }


    }

    window.adminUpdateBooking = async function (id, status) {
        try {
            await fetch(`/api/admin/bookings/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            showAdminDashboard(); // Refresh
        } catch { }
    };

    window.adminLogout = async function () {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = 'index.html';
    };
});

// ══════════════════════════════════════════════════════════════
// Global: Toggle Password Visibility
// ══════════════════════════════════════════════════════════════
function togglePassword(fieldId, btn) {
    const field = document.getElementById(fieldId);
    if (field.type === 'password') {
        field.type = 'text';
        btn.textContent = '🔒';
    } else {
        field.type = 'password';
        btn.textContent = '👁';
    }
}
