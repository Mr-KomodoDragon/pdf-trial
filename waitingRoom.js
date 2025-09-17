export function createWaitingRoom(position, total) {
  const lobby = document.createElement("div");
  const card = document.createElement("div");

  lobby.className = "lobby";
  card.className = "lobby-card";

  const title = document.createElement("div");
  title.className = "lobby-title";
  title.textContent = "⏳ Waiting Room";

  const positionText = document.createElement("div");
  positionText.className = "lobby-position";
  positionText.textContent = position && total ? `You are in position ${position}/${total}` : "Joining queue...";

  const note = document.createElement("div");
  note.className = "lobby-note";
  note.innerHTML = "Please keep this tab open.<br />You'll automatically enter when it's your turn.";

  card.appendChild(title);
  card.appendChild(positionText);
  card.appendChild(note);
  lobby.appendChild(card);

  return lobby;
}