"use strict";

const choices = document.querySelector(".choices");
const buttons = [...choices.querySelectorAll("[data-choice]")];

choices.addEventListener("click", (event) => {
  const button = event.target.closest("[data-choice]");
  if (!button) return;
  const option = document.querySelector(`[data-option="${button.dataset.choice}"]`);
  if (!option) return;

  const mark = option.querySelector(".mark").cloneNode(true);
  mark.style.setProperty("--size", "44px");
  const favicon = mark.cloneNode(true);
  favicon.style.setProperty("--size", "16px");

  document.getElementById("preview-mark").replaceChildren(mark);
  document.getElementById("preview-favicon").replaceChildren(favicon);
  document.getElementById("preview-wordmark").replaceChildren(option.querySelector(".wordmark").cloneNode(true));
  document.querySelector(".brand").dataset.family = option.dataset.family;
  document.getElementById("preview-caption").textContent = `Opção ${option.dataset.option} · ${option.dataset.name}`;
  for (const choice of buttons) choice.setAttribute("aria-pressed", String(choice === button));
});
