const canvas = $("#signature")[0].getContext("2d");
let sig = $("#signature");
const check = $("#check");
let submit = $(".submit");
let signaturehidden = $("[name=signature]");
let writing = false;
$(document).on(`keydown`, e => e.keyCode === 13 && $(`#form`).submit());

sig
    .on("mousedown", e => {
        writing = true;
        console.log("MouseDown");
        canvas.strokeStyle = "#000";
        canvas.moveTo(e.offsetX, e.offsetY);
    })
    .on("mousemove", e => {
        if (writing) {
            canvas.lineTo(e.offsetX, e.offsetY);
            canvas.stroke();
            let signed = sig[0].toDataURL();
            signaturehidden.val(signed);
        }
    });

$(document).on("mouseup", () => {
    writing = false;
    console.log("MouseUp");
});
