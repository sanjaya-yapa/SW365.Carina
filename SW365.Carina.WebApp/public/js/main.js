window.showMessage = function showMessage(message, type) {
  const mappedType = type || 'info';
  console.log(`[${mappedType}] ${message}`);
};
