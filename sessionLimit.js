export function createMultipleTabsUI() {
  // Load the enhanced CSS file
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "multiple-tabs.css";
  document.head.appendChild(link);

  const lobby = document.createElement("div");
  const card = document.createElement("div");

  lobby.className = "multiple-tabs";
  card.className = "multiple-tabs-card";

  // Emoji icon
  const icon = document.createElement("div");
  icon.className = "multiple-tabs-icon";
  icon.textContent = "⚠️";

  // Title
  const title = document.createElement("div");
  title.className = "multiple-tabs-title";
  title.textContent = "Session Limit";

  // Message
  const message = document.createElement("div");
  message.className = "multiple-tabs-message";
  message.innerHTML = "You can only open one tab at a time.<br />Please close other tabs and refresh this page.";

  card.appendChild(icon);
  card.appendChild(title);
  card.appendChild(message);
  lobby.appendChild(card);

  return lobby;
}