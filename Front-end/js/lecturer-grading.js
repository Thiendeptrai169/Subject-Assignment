// Global variables
let currentGroups = []
let selectedGroup = null
let currentReportPeriods = []
let filterOptions = {}
let lecturerGradingPageInitialized = false
let lecturerGradingPageCleanup = null

// Import Bootstrap
const bootstrap = window.bootstrap

// Initialize page
function initLecturerGradingPage() {
  if (lecturerGradingPageInitialized && lecturerGradingPageCleanup) {
    lecturerGradingPageCleanup()
  }

  const token = localStorage.getItem("token")
  // DOM elements
  const subjectFilter = document.getElementById("subject-filter")
  const classFilter = document.getElementById("class-filter")
  const projectFilter = document.getElementById("project-filter")
  const statusFilter = document.getElementById("status-filter")
  const searchInput = document.getElementById("search-input")
  const searchButton = document.getElementById("search-button")
  const refreshButton = document.getElementById("refresh-button")
  const groupsList = document.getElementById("groups-list")
  const gradingPanel = document.getElementById("grading-panel")
  const gradeForm = document.getElementById("grade-form")

  // Modals
  const gradeModal = new bootstrap.Modal(document.getElementById("gradeModal"))
  const successModal = new bootstrap.Modal(document.getElementById("successModal"))

  // Event listeners array for cleanup
  const eventListeners = []

  // Helper function to add event listeners with cleanup tracking
  function addEventListenerWithCleanup(element, event, handler, options = false) {
    if (element) {
      element.addEventListener(event, handler, options)
      eventListeners.push({ element, event, handler, options })
    }
  }

  // API helper function
  async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("token")
    if (!token) throw new Error("Chưa đăng nhập hoặc thiếu token")

    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.message || "Lỗi server")
    }

    return response.json()
  }

  // Load filter options (optional - if you want to load from API)
  async function loadFilterOptions() {
    try {
      // This is optional if you want to load filter options from a separate API
      // const data = await fetchWithAuth("/api/filter-options")
      // filterOptions = data
      console.log("Filter options will be populated from groups data")
    } catch (error) {
      console.error("Error loading filter options:", error)
    }
  }

  // Populate select element
  function populateSelect(selectElement, options, valueField, textField) {
    if (!selectElement || !options) return

    const firstOption = selectElement.options[0]
    selectElement.innerHTML = ""
    if (firstOption) {
      selectElement.appendChild(firstOption)
    }

    options.forEach((option) => {
      const optionElement = document.createElement("option")
      optionElement.value = option[valueField]
      optionElement.textContent = option[textField]
      selectElement.appendChild(optionElement)
    })
  }

  // Populate filter options from groups data
  function populateFilterOptionsFromGroups() {
    if (!currentGroups || currentGroups.length === 0) return

    // Extract unique values
    const subjects = [...new Set(currentGroups.map((g) => g.SubjectName).filter(Boolean))].sort()
    const classes = [...new Set(currentGroups.map((g) => g.ClassCode).filter(Boolean))].sort()
    const projects = [...new Set(currentGroups.map((g) => g.ProjectName).filter(Boolean))].sort()

    // Populate dropdowns
    fillSelectOptions(subjectFilter, subjects)
    fillSelectOptions(classFilter, classes)
    fillSelectOptions(projectFilter, projects)

    // Populate status filter
    fillSelectOptions(statusFilter, ["Chưa báo cáo", "Đã báo cáo", "Hoàn thành", "Chờ chấm điểm"])
  }

  function fillSelectOptions(selectEl, options) {
    if (!selectEl) return

    const firstOption = selectEl.options[0]
    selectEl.innerHTML = ""
    if (firstOption) selectEl.appendChild(firstOption)

    if (!Array.isArray(options)) return

    options.forEach((opt) => {
      const option = document.createElement("option")
      option.value = opt
      option.textContent = opt
      selectEl.appendChild(option)
    })
  }

  // Load groups data
  async function loadGroupsData() {
    try {
      showLoading(true)

      const url = `/api/lecturer-subjects`
      const data = await fetchWithAuth(url)
      currentGroups = data.groups || []

      console.log("Loaded groups:", currentGroups) // Debug log

      // Load reports for each group using the same API endpoint as your example
      for (const group of currentGroups) {
        try {
          const reportData = await fetchWithAuth(`/api/report-period/${group.GroupId}/reports`)
          group.reports = reportData.reports || []
          console.log(`Reports for group ${group.GroupId}:`, group.reports) // Debug log
        } catch (error) {
          console.error(`Error loading reports for group ${group.GroupId}:`, error)
          group.reports = []
        }
      }

      // Populate filter options from loaded data
      populateFilterOptionsFromGroups()

      await loadStatistics()
      renderGroupsList()
    } catch (error) {
      console.error("Error loading groups:", error)
      showError("Không thể tải danh sách nhóm")
    } finally {
      showLoading(false)
    }
  }

  // Load statistics
  async function loadStatistics() {
    try {
      const data = await fetchWithAuth("/api/report-period/reports/statistics")
      const stats = data.statistics

      document.getElementById("total-groups").textContent = stats.TotalGroups || 0
      document.getElementById("total-reports").textContent = stats.CompletedReports || 0
      document.getElementById("pending-reports").textContent = stats.PendingReports || 0
      document.getElementById("avg-score").textContent = (stats.AverageScore || 0).toFixed(1)
    } catch (error) {
      console.error("Error loading statistics:", error)
    }
  }

  // Calculate final score
  function calculateFinalScore(group) {
    let finalScore = 0
    let totalPercent = 0

    // Nếu group có reports array, sử dụng nó
    if (group.reports && group.reports.length > 0) {
      group.reports.forEach((report) => {
        if (report.ScorePeriod > 0 && report.PercentScorePeriod > 0) {
          finalScore += (report.ScorePeriod * report.PercentScorePeriod) / 100
          totalPercent += report.PercentScorePeriod
        }
      })
    } else {
      // Fallback về cách cũ nếu không có reports
      if (group.Score1 > 0 && group.Percent1 > 0) {
        finalScore += (group.Score1 * group.Percent1) / 100
        totalPercent += group.Percent1
      }
      if (group.Score2 > 0 && group.Percent2 > 0) {
        finalScore += (group.Score2 * group.Percent2) / 100
        totalPercent += group.Percent2
      }
      if (group.ScoreFinal > 0 && group.PercentFinal > 0) {
        finalScore += (group.ScoreFinal * group.PercentFinal) / 100
        totalPercent += group.PercentFinal
      }
    }

    return { finalScore, totalPercent }
  }

  // Get score class for styling - simplified version
  function getScoreClass(score) {
    return "score-display" // Simple neutral styling
  }

  // Get score by period from reports array - similar to your renderReportDetails function
  function getScoreByPeriod(reports, periodName) {
    console.log("getScoreByPeriod called with:", { reports, periodName }) // Debug log

    if (!reports || reports.length === 0) {
      console.log("No reports found") // Debug log
      return { score: 0, percent: 0 }
    }

    const report = reports.find((r) => r.ReportOrder === periodName)
    console.log("Found report:", report) // Debug log

    return {
      score: report ? report.ScorePeriod : 0,
      percent: report ? report.PercentScorePeriod : 0,
    }
  }

  // Render groups list
  function renderGroupsList() {
    if (currentGroups.length === 0) {
      groupsList.innerHTML = `
        <div class="text-center p-4">
          <i class="fas fa-search fa-2x text-muted mb-2"></i>
          <p class="text-muted">Không tìm thấy nhóm nào phù hợp</p>
        </div>
      `
      document.getElementById("groups-count").textContent = "0"
      return
    }

    let html = ""
    currentGroups.forEach((group) => {
      const pendingCount = group.PendingReports || 0
      const completedCount = group.CompletedReports || 0
      const isSelected = selectedGroup && selectedGroup.GroupId === group.GroupId

      // Calculate final score
      const { finalScore, totalPercent } = calculateFinalScore(group)

      // Get scores for each period using the same logic as your renderReportDetails
      const score1 = getScoreByPeriod(group.reports, "Lần 1")
      const score2 = getScoreByPeriod(group.reports, "Lần 2")
      const scoreFinal = getScoreByPeriod(group.reports, "Cuối kỳ")

      const hasAllScores = score1.score > 0 && score2.score > 0 && scoreFinal.score > 0

      html += `
        <div class="group-card p-3 ${isSelected ? "selected" : ""}" data-group-id="${group.GroupId}">
          <!-- Group Header -->
          <div class="group-header">
            <div class="flex-grow-1">
              <div class="group-title">${group.GroupName}</div>
              <div class="group-subtitle">${group.ProjectName}</div>
              <div class="group-meta">
                <i class="fas fa-book me-1"></i>${group.SubjectName} • 
                <i class="fas fa-users me-1"></i>${group.ClassCode} • 
                <i class="fas fa-user-tie me-1"></i>${group.LeaderName}
              </div>
            </div>
          </div>

          <!-- Status Badges -->
          <div class="status-badges">
            ${pendingCount > 0 ? `<span class="badge bg-warning badge-status"><i class="fas fa-clock me-1"></i>${pendingCount} chờ chấm</span>` : ""}
            ${completedCount > 0 ? `<span class="badge bg-success badge-status"><i class="fas fa-check me-1"></i>${completedCount} hoàn thành</span>` : ""}
            ${group.TotalMembers ? `<span class="badge bg-info badge-status"><i class="fas fa-users me-1"></i>${group.TotalMembers} thành viên</span>` : ""}
          </div>

          <!-- Score Summary -->
          <div class="score-summary">
            <!-- Individual Scores Grid -->
            <div class="score-grid">
              <div class="score-item ${score1.score > 0 ? "has-score" : "no-score"}">
                <div class="score-label">Lần 1</div>
                <div class="score-value">${score1.score > 0 ? score1.score.toFixed(1) : "---"}</div>
                <div class="score-percent">${score1.percent || 0}%</div>
              </div>
              <div class="score-item ${score2.score > 0 ? "has-score" : "no-score"}">
                <div class="score-label">Lần 2</div>
                <div class="score-value">${score2.score > 0 ? score2.score.toFixed(1) : "---"}</div>
                <div class="score-percent">${score2.percent || 0}%</div>
              </div>
              <div class="score-item ${scoreFinal.score > 0 ? "has-score" : "no-score"}">
                <div class="score-label">Cuối kỳ</div>
                <div class="score-value">${scoreFinal.score > 0 ? scoreFinal.score.toFixed(1) : "---"}</div>
                <div class="score-percent">${scoreFinal.percent || 0}%</div>
              </div>
            </div>

            <!-- Final Score Bar -->
            <div class="final-score-bar score-display" style="--score-width: ${(finalScore / 10) * 100}%">
              ${
                hasAllScores
                  ? `<strong>Điểm tổng kết: ${finalScore.toFixed(1)}/10 (${totalPercent}%)</strong>`
                  : `<strong>Chưa đủ điểm để tính tổng kết</strong>`
              }
            </div>

            <!-- Progress Indicator -->
            <div class="progress-indicator">
              <div class="progress-fill" style="width: ${(completedCount / 3) * 100}%"></div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button class="btn btn-outline-info btn-sm btn-view-details" data-group-id="${group.GroupId}">
              <i class="fas fa-eye me-1"></i>Chi tiết
            </button>
            <button class="btn btn-primary btn-sm btn-grade-group" data-group-id="${group.GroupId}">
              <i class="fas fa-edit me-1"></i>Chấm điểm
            </button>
          </div>
        </div>
      `
    })

    groupsList.innerHTML = html
    document.getElementById("groups-count").textContent = currentGroups.length
  }

  // Load report periods for selected group - using same API as your example
  async function loadReportPeriodsFunc(groupId) {
    try {
      const data = await fetchWithAuth(`/api/report-period/${groupId}/reports`)
      currentReportPeriods = data.reports || []
      renderGradingPanelFunc()
    } catch (error) {
      console.error("Error loading report periods:", error)
      showError("Không thể tải danh sách đợt báo cáo")
    }
  }

  // Render grading panel
  function renderGradingPanelFunc() {
    if (!selectedGroup) {
      gradingPanel.innerHTML = `
        <div class="text-center p-5">
          <i class="fas fa-mouse-pointer fa-3x text-muted mb-3"></i>
          <h5 class="text-muted">Chọn một nhóm để xem chi tiết</h5>
          <p class="text-muted">Nhấp vào một nhóm bên trái để xem thông tin chi tiết và điểm số các đợt báo cáo</p>
        </div>
      `
      return
    }

    const { finalScore, totalPercent } = calculateFinalScore(selectedGroup)

    let html = `
      <div class="fade-in">
        <!-- Group Info Header -->
        <div class="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h5 class="mb-1">${selectedGroup.GroupName}</h5>
            <p class="text-muted mb-1">${selectedGroup.ProjectName || "Chưa có đề tài"}</p>
            <small class="text-muted">
              ${selectedGroup.SubjectName} • ${selectedGroup.ClassCode} • 
              Trưởng nhóm: ${selectedGroup.LeaderName}
            </small>
          </div>
          <button class="btn btn-primary btn-sm btn-grade-all" data-group-id="${selectedGroup.GroupId}">
            <i class="fas fa-edit me-2"></i>Nhập điểm
          </button>
        </div>

        <!-- Score Detail Panel -->
        <div class="score-detail-panel">
          <!-- Final Score Summary -->
          <div class="final-score-bar score-display mb-3" style="--score-width: ${(finalScore / 10) * 100}%">
            ${
              finalScore > 0
                ? `<strong>Điểm tổng kết: ${finalScore.toFixed(1)}/10</strong>`
                : `<strong>Chưa có điểm tổng kết</strong>`
            }
          </div>

          <!-- Period Details -->
    `

    if (currentReportPeriods.length === 0) {
      html += `
        <div class="text-center p-4">
          <i class="fas fa-clipboard fa-2x text-muted mb-2"></i>
          <p class="text-muted">Chưa có đợt báo cáo nào</p>
        </div>
      `
    } else {
      currentReportPeriods.forEach((period) => {
        const hasScore = period.ScorePeriod > 0
        const statusClass = hasScore ? "completed" : "pending"
        const statusIcon = hasScore ? "fas fa-check-circle text-success" : "fas fa-clock text-warning"
        const statusText = hasScore ? "Đã chấm điểm" : "Chưa chấm điểm"

        html += `
          <div class="period-detail-card ${statusClass}">
            <div class="period-header">
              <div class="period-title">${period.ReportOrder}</div>
              <div class="period-status">
                <i class="${statusIcon} me-1"></i>
                <span class="small">${statusText}</span>
              </div>
            </div>
            
            <div class="period-score-display">
              <div class="period-score-main">
                ${hasScore ? `${period.ScorePeriod}/10` : "---"}
              </div>
              <div class="period-score-details">
                <div>Tỷ lệ: <strong>${period.PercentScorePeriod || 0}%</strong></div>
                ${hasScore && period.ReportDate ? `<div class="text-muted small">Ngày báo cáo: ${new Date(period.ReportDate).toLocaleDateString("vi-VN")}</div>` : ""}
                ${period.Description ? `<div class="text-muted small mt-1">${period.Description}</div>` : ""}
              </div>
            </div>
          </div>
        `
      })
    }

    html += `
        </div>
      </div>
    `

    gradingPanel.innerHTML = html
  }

  // Show grade modal
  function showGradeModalFunc() {
    // Fill modal with current data
    document.getElementById("modal-group-name").value = selectedGroup.GroupName
    document.getElementById("modal-project-name").value = selectedGroup.ProjectName || "Chưa có đề tài"

    // Create form for all periods
    const container = document.getElementById("periods-form-container")

    let formHTML = ""

    currentReportPeriods.forEach((period, index) => {
      formHTML += `
        <div class="period-card">
          <div class="period-card-header">
            <h6 class="mb-0">${period.ReportOrder}</h6>
          </div>
          <div class="period-card-body">
            <div class="row">
              <div class="col-md-4">
                <label class="form-label">Điểm <span class="text-danger">*</span></label>
                <input type="number" class="form-control score-input" 
                       data-period="${period.ReportOrder}"
                       min="0" max="10" step="0.1" 
                       value="${period.ScorePeriod || ""}" 
                       placeholder="0.0 - 10.0" required>
              </div>
              <div class="col-md-4">
                <label class="form-label">Tỷ lệ (%) <span class="text-danger">*</span></label>
                <input type="number" class="form-control percent-input" 
                       data-period="${period.ReportOrder}"
                       min="0" max="100" step="1" 
                       value="${period.PercentScorePeriod || ""}" 
                       placeholder="0 - 100" required>
              </div>
              <div class="col-md-4">
                <label class="form-label">Trạng thái</label>
                <select class="form-select status-input" data-period="${period.ReportOrder}">
                  <option value="Chưa báo cáo" ${period.ReportPeriodStatus === "Chưa báo cáo" ? "selected" : ""}>Chưa báo cáo</option>
                  <option value="Đã báo cáo" ${period.ReportPeriodStatus === "Đã báo cáo" ? "selected" : ""}>Đã báo cáo</option>
                </select>
              </div>
            </div>
            <div class="mt-3">
              <label class="form-label">Mô tả</label>
              <textarea class="form-control description-input" 
                        data-period="${period.ReportOrder}"
                        rows="2" 
                        placeholder="Mô tả đợt báo cáo...">${period.Description || ""}</textarea>
            </div>
          </div>
        </div>
      `
    })

    container.innerHTML = formHTML

    // Add event listeners for percentage calculation
    addPercentageCalculationListenersFunc()

    // Calculate initial percentage
    calculateTotalPercentageFunc()

    gradeModal.show()
  }

  // Add percentage calculation listeners
  function addPercentageCalculationListenersFunc() {
    const percentInputs = document.querySelectorAll(".percent-input")
    percentInputs.forEach((input) => {
      input.addEventListener("input", calculateTotalPercentageFunc)
    })
  }

  // Calculate total percentage - simplified without validation
  function calculateTotalPercentageFunc() {
    const percentInputs = document.querySelectorAll(".percent-input")
    let total = 0

    percentInputs.forEach((input) => {
      const value = Number.parseInt(input.value) || 0
      total += value
    })

    document.getElementById("total-percent").textContent = total

    // Remove validation - always enable save button
    const saveButton = document.getElementById("save-grades-btn")
    if (saveButton) {
      saveButton.disabled = false
    }

    // Hide or remove status element
    const statusElement = document.getElementById("percent-status")
    if (statusElement) {
      statusElement.style.display = "none"
    }
  }

  // Handle group selection
  function handleGroupClickFunc(event) {
    const groupCard = event.target.closest(".group-card")
    if (!groupCard) return

    const groupId = groupCard.getAttribute("data-group-id")
    selectedGroup = currentGroups.find((g) => g.GroupId == groupId)

    // Update UI
    document.querySelectorAll(".group-card").forEach((card) => {
      card.classList.remove("selected")
    })
    groupCard.classList.add("selected")

    // Load report periods
    loadReportPeriodsFunc(groupId)
  }

  // Handle grade button click
  function handleGradeClickFunc(event) {
    const gradeBtn = event.target.closest(".btn-grade-group, .btn-grade-all")
    if (!gradeBtn) return

    const groupId = gradeBtn.getAttribute("data-group-id")
    selectedGroup = currentGroups.find((g) => g.GroupId == groupId)

    if (!selectedGroup) return

    // Load report periods and show modal
    loadReportPeriodsFunc(groupId).then(() => {
      showGradeModalFunc()
    })
  }

  // Handle grade form submission
  async function handleGradeSubmitFunc(event) {
    event.preventDefault()

    const grades = []
    let totalPercent = 0

    // Collect data from form
    currentReportPeriods.forEach((period) => {
      const scoreInput = document.querySelector(`input[data-period="${period.ReportOrder}"].score-input`)
      const percentInput = document.querySelector(`input[data-period="${period.ReportOrder}"].percent-input`)
      const descriptionInput = document.querySelector(`textarea[data-period="${period.ReportOrder}"].description-input`)

      const score = Number.parseFloat(scoreInput.value) || 0
      const percent = Number.parseInt(percentInput.value) || 0
      const description = descriptionInput.value.trim()

      if (score < 0 || score > 10) {
        alert(`Điểm ${period.ReportOrder} phải từ 0 đến 10`)
        return
      }

      if (percent < 0 || percent > 100) {
        alert(`Tỷ lệ ${period.ReportOrder} phải từ 0 đến 100`)
        return
      }

      totalPercent += percent
      grades.push({
        reportOrder: period.ReportOrder,
        score: score,
        percent: percent,
        description: description,
      })
    })

    try {
      await fetchWithAuth(`/api/subject-grading/${selectedGroup.GroupId}/grades`, {
        method: "PUT",
        body: JSON.stringify({ grades }),
      })

      gradeModal.hide()
      successModal.show()

      // Reload data
      await loadGroupsData()
      if (selectedGroup) {
        await loadReportPeriodsFunc(selectedGroup.GroupId)
      }
    } catch (error) {
      console.error("Error saving grades:", error)
      alert("Có lỗi xảy ra khi lưu điểm: " + error.message)
    }
  }

  // Utility functions
  function showLoading(show) {
    const spinner = document.querySelector(".loading-spinner")
    if (spinner) {
      spinner.style.display = show ? "block" : "none"
    }
  }

  function showError(message) {
    groupsList.innerHTML = `
      <div class="text-center p-4">
        <i class="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>
        <p class="text-danger">${message}</p>
      </div>
    `
  }

  // Debounce function
  function debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Event handlers
  const handleFilterChangeFunc = () => {
    // Remove automatic API call - filters will be applied client-side
    applyClientSideFiltersFunc()
  }

  const handleSearchInputFunc = () => {
    // Remove automatic API call - search will be applied client-side
    applyClientSideFiltersFunc()
  }

  const handleSearchButtonFunc = () => {
    applyClientSideFiltersFunc()
  }

  const handleRefreshButtonFunc = () => {
    // Reset filters
    subjectFilter.value = ""
    classFilter.value = ""
    projectFilter.value = ""
    statusFilter.value = ""
    searchInput.value = ""

    // Reload data
    loadGroupsData()
  }

  const handleDocumentClickFunc = (event) => {
    handleGroupClickFunc(event)
    handleGradeClickFunc(event)
  }

  // Apply client-side filters
  function applyClientSideFiltersFunc() {
    if (!currentGroups || currentGroups.length === 0) {
      console.log("No groups data available for filtering")
      return
    }

    let filteredGroups = [...currentGroups]

    // Apply subject filter
    if (subjectFilter.value) {
      filteredGroups = filteredGroups.filter((group) => group.SubjectName === subjectFilter.value)
    }

    // Apply class filter
    if (classFilter.value) {
      filteredGroups = filteredGroups.filter((group) => group.ClassCode === classFilter.value)
    }

    // Apply project filter
    if (projectFilter.value) {
      filteredGroups = filteredGroups.filter((group) => group.ProjectName === projectFilter.value)
    }

    // Apply search filter
    if (searchInput.value.trim()) {
      const searchTerm = searchInput.value.trim().toLowerCase()
      filteredGroups = filteredGroups.filter(
        (group) =>
          group.GroupName.toLowerCase().includes(searchTerm) ||
          group.ProjectName?.toLowerCase().includes(searchTerm) ||
          group.LeaderName?.toLowerCase().includes(searchTerm),
      )
    }

    // Apply status filter
    

    // Update the display with filtered results
    renderFilteredGroupsListFunc(filteredGroups)
  }

  // Render filtered groups list
  function renderFilteredGroupsListFunc(groups = currentGroups) {
    if (groups.length === 0) {
      groupsList.innerHTML = `
        <div class="text-center p-4">
          <i class="fas fa-search fa-2x text-muted mb-2"></i>
          <p class="text-muted">Không tìm thấy nhóm nào phù hợp</p>
        </div>
      `
      document.getElementById("groups-count").textContent = "0"
      return
    }

    let html = ""
    groups.forEach((group) => {
      const pendingCount = group.PendingReports || 0
      const completedCount = group.CompletedReports || 0
      const isSelected = selectedGroup && selectedGroup.GroupId === group.GroupId

      // Calculate final score
      const { finalScore, totalPercent } = calculateFinalScore(group)
      const score1 = getScoreByPeriod(group.reports, "Lần 1")
      const score2 = getScoreByPeriod(group.reports, "Lần 2")
      const scoreFinal = getScoreByPeriod(group.reports, "Cuối kỳ")

      const hasAllScores = score1.score > 0 && score2.score > 0 && scoreFinal.score > 0

      html += `
        <div class="group-card p-3 ${isSelected ? "selected" : ""}" data-group-id="${group.GroupId}">
          <!-- Group Header -->
          <div class="group-header">
            <div class="flex-grow-1">
              <div class="group-title">${group.GroupName}</div>
              <div class="group-subtitle">${group.ProjectName}</div>
              <div class="group-meta">
                <i class="fas fa-book me-1"></i>${group.SubjectName} • 
                <i class="fas fa-users me-1"></i>${group.ClassCode} • 
                <i class="fas fa-user-tie me-1"></i>${group.LeaderName}
              </div>
            </div>
          </div>

          <!-- Score Summary -->
          <div class="score-summary">
            <!-- Individual Scores Grid -->
            <div class="score-grid">
              <div class="score-item ${score1.score > 0 ? "has-score" : "no-score"}">
                <div class="score-label">Lần 1</div>
                <div class="score-value">${score1.score > 0 ? score1.score.toFixed(1) : "---"}</div>
                <div class="score-percent">${score1.percent || 0}%</div>
              </div>
              <div class="score-item ${score2.score > 0 ? "has-score" : "no-score"}">
                <div class="score-label">Lần 2</div>
                <div class="score-value">${score2.score > 0 ? score2.score.toFixed(1) : "---"}</div>
                <div class="score-percent">${score2.percent || 0}%</div>
              </div>
              <div class="score-item ${scoreFinal.score > 0 ? "has-score" : "no-score"}">
                <div class="score-label">Cuối kỳ</div>
                <div class="score-value">${scoreFinal.score > 0 ? scoreFinal.score.toFixed(1) : "---"}</div>
                <div class="score-percent">${scoreFinal.percent || 0}%</div>
              </div>
            </div>

            <!-- Final Score Bar -->
            <div class="final-score-bar score-display" style="--score-width: ${(finalScore / 10) * 100}%">
              ${
                hasAllScores
                  ? `<strong>Điểm tổng kết: ${finalScore.toFixed(1)}/10 (${totalPercent}%)</strong>`
                  : `<strong>Chưa đủ điểm để tính tổng kết</strong>`
              }
            </div>

            <!-- Progress Indicator -->
            <div class="progress-indicator">
              <div class="progress-fill" style="width: ${(completedCount / 3) * 100}%"></div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="action-buttons">
            <button class="btn btn-outline-info btn-sm btn-view-details" data-group-id="${group.GroupId}">
              <i class="fas fa-eye me-1"></i>Chi tiết
            </button>
            <button class="btn btn-primary btn-sm btn-grade-group" data-group-id="${group.GroupId}">
              <i class="fas fa-edit me-1"></i>Chấm điểm
            </button>
          </div>
        </div>
      `
    })

    groupsList.innerHTML = html
    document.getElementById("groups-count").textContent = groups.length
  }

  // Add event listeners
  addEventListenerWithCleanup(subjectFilter, "change", handleFilterChangeFunc)
  addEventListenerWithCleanup(classFilter, "change", handleFilterChangeFunc)
  addEventListenerWithCleanup(projectFilter, "change", handleFilterChangeFunc)
  if (statusFilter) {
    addEventListenerWithCleanup(statusFilter, "change", handleFilterChangeFunc)
  }
  addEventListenerWithCleanup(searchInput, "input", handleSearchInputFunc)
  addEventListenerWithCleanup(searchButton, "click", handleSearchButtonFunc)
  if (refreshButton) {
    addEventListenerWithCleanup(refreshButton, "click", handleRefreshButtonFunc)
  }
  addEventListenerWithCleanup(document, "click", handleDocumentClickFunc)
  addEventListenerWithCleanup(gradeForm, "submit", handleGradeSubmitFunc)

  // Cleanup function
  lecturerGradingPageCleanup = () => {
    // Remove all event listeners
    eventListeners.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options)
      }
    })
    eventListeners.length = 0

    // Reset state
    currentGroups = []
    selectedGroup = null
    currentReportPeriods = []
    filterOptions = {}

    console.log("Lecturer grading page cleaned up")
  }

  // Mark as initialized
  lecturerGradingPageInitialized = true

  // Initialize data
  loadFilterOptions()
  loadGroupsData()

  console.log("Lecturer grading page initialized")
}

// Cleanup function
function cleanupLecturerGradingPage() {
  if (lecturerGradingPageCleanup) {
    lecturerGradingPageCleanup()
    lecturerGradingPageInitialized = false
    lecturerGradingPageCleanup = null
  }
}

// Auto-initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initLecturerGradingPage()
})

// Export cleanup function
window.cleanupLecturerGradingPage = cleanupLecturerGradingPage
