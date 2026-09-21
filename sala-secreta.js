const atalhoSecreto = document.getElementById("atalhoSecreto");

if (atalhoSecreto) {
    let toques = 0;
    let reiniciarToques = 0;

    atalhoSecreto.addEventListener("click", () => {
        window.clearTimeout(reiniciarToques);
        toques += 1;

        if (toques >= 5) {
            window.location.href = "sala-codigos.html";
            return;
        }

        reiniciarToques = window.setTimeout(() => {
            toques = 0;
        }, 1800);
    });
}
