/*
 written by: Lawrence McDaniel

 This is a refactored implementation of the Matrix Raining Letters effect based on this blog post
 https://dev.to/javascriptacademy/matrix-raining-code-effect-using-javascript-4hep


*/
import React from "react";
import { useRef } from "react";
import { useEffect } from "react";

import "./style.css";

const DEFAULT_WORDS = ["OPULENCE", "AAC", "GPRIME2026"];
const FRAME_DELAY = 75;
const DROP_STEP_PROBABILITY = 0.5;

const createColumns = (canvas, fontSize, words) => {
    const columns = Math.ceil(canvas.width / fontSize);

    return Array.from({ length: columns }, (_, index) => ({
        y: Math.floor(Math.random() * Math.max(1, Math.floor(canvas.height / fontSize))),
        wordIndex: index % words.length,
        charIndex: 0,
    }));
};

const renderMatrix = (ref, color, words) => {
    const canvas = ref.current;
    const context = canvas.getContext("2d");
    const fontSize = 30;
    const sequence = words.length ? words : DEFAULT_WORDS;
    let rainDrops = [];

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        rainDrops = createColumns(canvas, fontSize, sequence);
    };

    resizeCanvas();

    const render = () => {
        context.fillStyle = "rgba(0, 0, 0, 0.05)"; // black w a tiny bit of alpha
        context.fillRect(0, 0, canvas.width, canvas.height);

        context.fillStyle = color ? color : "FF4400";
        context.font = fontSize + "px monospace";

        for (let i = 0; i < rainDrops.length; i++) {
            const drop = rainDrops[i];
            const word = sequence[drop.wordIndex];
            const text = word.charAt(drop.charIndex);

            context.fillText(text, i * fontSize, drop.y * fontSize);

            if (drop.y * fontSize > canvas.height && Math.random() > 0.975) {
                drop.y = 0;
                drop.charIndex = 0;
                drop.wordIndex = (drop.wordIndex + 1) % sequence.length;
            }

            if (Math.random() < DROP_STEP_PROBABILITY) {
                drop.y += 1;
                drop.charIndex = (drop.charIndex + 1) % word.length;
            }
        }
    };

    return { render, resizeCanvas };
};

const MatrixRainingLetters = (props) => {
    const ref = useRef();
    const keyName = "mrl-" + props.key;
    const thisClassName = "mrl-container " + props.custom_class;

    useEffect(() => {
        const words = Array.isArray(props.words) && props.words.length
            ? props.words
            : DEFAULT_WORDS;
        const { render, resizeCanvas } = renderMatrix(ref, props.color, words);
        const intervalId = setInterval(render, FRAME_DELAY);
        window.addEventListener("resize", resizeCanvas);

        render();

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("resize", resizeCanvas);
        };
    }, [props.color, props.words]);

    return (
        <React.Fragment>
            <canvas key={keyName} className={thisClassName} ref={ref} />
        </React.Fragment>
    );
};

export default MatrixRainingLetters;
