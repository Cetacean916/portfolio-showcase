(function () {
  const brief = "안녕하세요. 포트폴리오를 보고 프로젝트를 문의드립니다.\n1. 필요한 서비스:\n2. 현재 문제 또는 반복 업무:\n3. 샘플 자료 제공 가능 여부:\n4. 원하는 결과물:\n5. 희망 일정:\n6. 반드시 포함하거나 제외할 범위:";

  async function copyText(value) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch {
        // Some browsers expose the API but reject it outside a trusted gesture.
      }
    }

    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.inset = "-9999px auto auto -9999px";
    document.body.append(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    if (!copied) throw new Error("Clipboard copy was rejected");
  }

  document.querySelectorAll("[data-copy-brief]").forEach((button) => {
    const control = button.closest("[data-copy-control]");
    const status = control?.querySelector("[data-copy-status]");
    const defaultLabel = button.textContent.trim();

    button.addEventListener("click", async () => {
      if (!status) return;
      if (button.dataset.copyPending === "true") return;
      const restoreFocus = document.activeElement === button;
      button.dataset.copyPending = "true";
      button.setAttribute("aria-busy", "true");
      status.dataset.state = "pending";
      status.textContent = "문의 양식을 복사하고 있습니다.";

      try {
        await copyText(brief);
        status.dataset.state = "success";
        status.textContent = "양식을 복사했습니다. 이용하시는 문의 채널에 붙여넣고 내용을 작성해 주세요.";
        button.textContent = "복사 완료";
      } catch {
        status.dataset.state = "error";
        status.textContent = "자동 복사에 실패했습니다. 브라우저의 클립보드 권한을 확인한 뒤 다시 시도해 주세요.";
        button.textContent = defaultLabel;
      } finally {
        delete button.dataset.copyPending;
        button.removeAttribute("aria-busy");
        if (restoreFocus) button.focus();
        window.setTimeout(() => { button.textContent = defaultLabel; }, 1800);
      }
    });
  });
})();
