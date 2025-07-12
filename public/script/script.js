document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const password = document.getElementById("password");
  const confirmPassword = document.getElementById("confirmPassword");
  const passwordFeedback = document.getElementById("passwordFeedback");
  const confirmFeedback = document.getElementById("confirmFeedback");

  form.addEventListener("submit", (e) => {
    let valid = true;

    // ✅ Password checks
    const value = password.value;
    const checks = {
      length: value.length >= 6,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
      symbol: /[^A-Za-z0-9]/.test(value),
    };

    const messages = [];
    if (!checks.length) messages.push("❌ Minimum 6 characters");
    if (!checks.upper) messages.push("❌ One uppercase letter");
    if (!checks.lower) messages.push("❌ One lowercase letter");
    if (!checks.number) messages.push("❌ One number");
    if (!checks.symbol) messages.push("❌ One symbol");

    if (!Object.values(checks).every(Boolean)) {
      valid = false;
      passwordFeedback.innerHTML = messages.join("<br>");
      passwordFeedback.style.color = "red";
    } else {
      passwordFeedback.innerHTML = "✅ Strong password";
      passwordFeedback.style.color = "green";
    }

    // ✅ Confirm Password check
    if (password.value !== confirmPassword.value) {
      valid = false;
      confirmFeedback.innerHTML = "❌ Passwords do not match";
      confirmFeedback.style.color = "red";
    } else {
      confirmFeedback.innerHTML = "✅ Passwords match";
      confirmFeedback.style.color = "green";
    }

    if (!valid) e.preventDefault(); // Stop form submit
  });
});



 // ✅ Auto-dismiss flash messages
    // setTimeout(() => {
    //   const successAlert = document.getElementById("flash-success");
    //   const errorAlert = document.getElementById("flash-error");
    //   if (successAlert) {
    //     successAlert.classList.remove("show");
    //     setTimeout(() => successAlert.remove(), 500); // remove after fade
    //   }
    //   if (errorAlert) {
    //     errorAlert.classList.remove("show");
    //     setTimeout(() => errorAlert.remove(), 500);
    //   }
    // }, 3000);


  // Auto-dismiss flash messages after 3 seconds
  // setTimeout(() => {
  //   const successAlert = document.getElementById('flash-success');
  //   const errorAlert = document.getElementById('flash-error');
  //   if (successAlert) {
  //     successAlert.classList.remove('show'); // Bootstrap fades it
  //   }
  //   if (errorAlert) {
  //     errorAlert.classList.remove('show');
  //   }
  // }, 3000);