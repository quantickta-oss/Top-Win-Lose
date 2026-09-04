// Automatically load tab based on URL parameter (e.g. ?branch=awada)
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const branchParam = urlParams.get('branch');

  if (branchParam) {
    const targetBranch = branchParam.toLowerCase();
    // Locate the navigation button matching the requested branch
    const navButtons = document.querySelectorAll('.nav-item');
    let targetButton = null;

    navButtons.forEach(btn => {
      if (btn.getAttribute('onclick')?.includes(`'${targetBranch}'`)) {
        targetButton = btn;
      }
    });

    if (targetButton) {
      switchTab(targetBranch, targetButton);
      return;
    }
  }

  // Default fallback if no parameter is provided
  renderManagementView();
});
