export const TASK_COMPLETED_CSS = `
.blobio-task-completed {
  width: fit-content;
  padding: 2px 7px;
  border: 1px solid rgba(156, 255, 183, .86);
  border-radius: 999px;
  background: rgba(67, 229, 111, .24);
  color: #c8ffd7;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: .09em;
  box-shadow: 0 0 9px rgba(77, 255, 133, .42);
  animation: blobio-task-completed-pulse 2.2s ease-in-out infinite;
  animation-play-state: paused;
}

.blobio-menu-panel.is-open .blobio-task-completed,
.blobio-chat-settings-panel.is-tasks .blobio-task-completed {
  animation-play-state: running;
}

@keyframes blobio-task-completed-pulse {
  50% {
    background: rgba(94, 255, 145, .4);
    box-shadow: 0 0 15px rgba(97, 255, 151, .72);
  }
}

@media (prefers-reduced-motion: reduce) {
  .blobio-task-completed { animation: none; }
}
`;
