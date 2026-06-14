const formularioRegistro = document.querySelector("#formulario-registro");
const mensajeRegistro = document.querySelector("#mensaje-registro");

formularioRegistro.addEventListener("submit", (evento) => {
  evento.preventDefault();

  mensajeRegistro.textContent = "Registro enviado como ejemplo visual. Para guardar respuestas, conecta este formulario con Google Forms o Google Sheets.";
  formularioRegistro.reset();
});
