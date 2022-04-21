const loader = document.querySelector(".loader-container");
const header = document.querySelector("header");
const test = document.querySelector(".test-container");
const contentContainer = document.querySelector(".content-container");
const statsContainer = document.querySelector(".stats-container");
const resultsContainer = document.querySelector(".results-container");
const restartButton = document.querySelector(".restart-btn");
const refreshButton = document.querySelector(".refresh-btn");
const searchInput = document.querySelector(".search-input");
const submitButton = document.querySelector(".submit-btn");
const errorSpan = document.querySelector("#error");
const wpmSpan = document.querySelector("#wpm");
const accuracySpan = document.querySelector("#accuracy");
const wpmResultSpan = document.querySelector("#wpm-result");
const accuracyResultSpan = document.querySelector("#accuracy-result");
const timerSpan = document.querySelector("#timer");
const timerCircle = document.querySelector(".timer-circle");

const endpoint = "https://en.wikipedia.org/w/api.php?";
const params = {
    origin: "*",
    format: "json",
    action: "query",
    prop: "extracts",
    exchars: 1200,
    exintro: true,
    explaintext: true,
    generator: "search",
    gsrlimit: 1,
};

let rawText = "";
let index;
let typos;
let time;
let interval;

const changeFormState = isDisabled => {
    searchInput.disabled = isDisabled;
    submitButton.disabled = isDisabled;
};

const clearForTestRestart = () => {
    wpmSpan.textContent = "...";
    accuracySpan.textContent = "...%";
    timerSpan.textContent = 60;
    timerCircle.style.strokeDashoffset = 0;
    index = 0;
    typos = 0;
    time = 60;
    interval = null;
};

const clearPreviousResults = () => {
    contentContainer.innerHTML = "";
    errorSpan.innerHTML = "";
    searchInput.value = "";
    clearForTestRestart();
};

const isInputEmpty = input => {
    if (!input || input === "") return true;
    return false;
};

const showError = error => {
    errorSpan.innerHTML = `${error}`;
};

const setLoaderState = isVisible => {
    const displayState = isVisible ? "flex" : "none";
    loader.style.display = displayState;
    statsContainer.style.display = isVisible ? "none" : "flex";
};

const indicateTypingProgress = (e, chars, charState) => {
    e.preventDefault();
    chars[index].classList.remove("current-char");
    chars[index].classList.add(charState);
    chars[index + 1]?.classList.add("current-char");
    chars[index + 1]?.parentElement.classList.add("current-word");
    chars[index + 1]?.parentElement.previousSibling?.classList.remove(
        "current-word"
    );
    index++;
};

const updateAccuracy = (numberOfTypedChars, charState) => {
    if (charState === "typo") {
        typos++;
    } else if (charState === true) {
        //Checking the state of the previous character if it's a typo when "Backspace" is pressed
        typos--;
    }

    accuracySpan.textContent = `${Math.floor(
        100 - (typos / numberOfTypedChars) * 100
    )}%`;

    if (numberOfTypedChars === 0) {
        accuracySpan.textContent = "...%";
    }
};

const showTypo = (e, chars) => {
    const indexTypo = index;
    chars[indexTypo].textContent = e.key;
    chars[indexTypo].classList.add("typo-visible");
    setTimeout(() => {
        chars[indexTypo].textContent = rawText[indexTypo];
        chars[indexTypo].classList.remove("typo-visible");
    }, 250);
};

const moveTextByProgress = text => {
    const textWrapper = text.querySelector(".text-wrapper");
    const currentWord = text.querySelector(".current-word");
    if (!currentWord) return;
    const currentWordHeight = currentWord.getBoundingClientRect().height;
    const currentWordPosition = currentWord.offsetTop;

    textWrapper.style.top =
        currentWordPosition > currentWordHeight * 5
            ? `${currentWordHeight * 5 - currentWordPosition}px`
            : "0px";
};

const updateProgressBar = (text, words) => {
    const progressBar = text.querySelector(".progress-bar");
    const currentWord = text.querySelector(".current-word");
    const indexCurrentWord = [].indexOf.call(words, currentWord);

    if (indexCurrentWord === -1) {
        progressBar.style.width = "100%";
    } else {
        progressBar.style.width = `${Math.floor(
            (indexCurrentWord / words.length) * 100
        )}%`;
    }
};

const calculateSpeed = (text, words) => {
    const currentWord = text.querySelector(".current-word");
    const indexCurrentWord = [].indexOf.call(words, currentWord);

    if (indexCurrentWord === -1) {
        wpmSpan.textContent = Math.floor(60 / ((60 - time) / words.length));
    } else {
        wpmSpan.textContent = Math.floor(60 / ((60 - time) / indexCurrentWord));
    }
};

const startTimer = (text, words, chars, handleTyping) => {
    if (
        (index === 0 && !chars[1].classList.contains("current-char")) ||
        interval !== null
    )
        return;

    changeFormState(true);

    interval = setInterval(() => {
        time--;
        timerSpan.textContent = time.toString().padStart(2, "0");
        timerCircle.style.strokeDashoffset = 377 - (377 / 60) * time;
        calculateSpeed(text, words);

        if (time === 0) {
            stopTimer(text, handleTyping);
        }
    }, 1000);
};

const stopTimer = (text, handleTyping) => {
    text.removeEventListener("keydown", handleTyping);
    clearInterval(interval);
    showTypingTestResults(text);
};

const showTypingTestResults = text => {
    const pauseBanner = document.querySelector(".pause-banner");
    pauseBanner.style.visibility = "hidden";
    text.blur();
    test.classList.add("blur");
    header.classList.add("blur");
    wpmResultSpan.textContent = wpmSpan.textContent;
    accuracyResultSpan.textContent = accuracySpan.textContent;
    resultsContainer.style.display = "flex";
};

const restartTypingTest = e => {
    clearInterval(interval);
    clearForTestRestart();
    changeFormState(false);
    test.classList.remove("blur");
    header.classList.remove("blur");
    resultsContainer.style.display = "none";

    const text = document.querySelector(".text");
    const words = text.querySelectorAll(".word");
    const chars = text.querySelectorAll(".char");
    const pauseBanner = document.querySelector(".pause-banner");

    words.forEach(word => {
        word.classList.remove("current-word");
    });
    chars.forEach(char => {
        char.classList.remove("typo", "valid", "current-char");
    });

    words[0].classList.add("current-word");
    chars[index].classList.add("current-char");
    pauseBanner.style.visibility = "visible";

    moveTextByProgress(text);
    updateProgressBar(text, words);
    text.focus();
    if (!e.target.classList.contains("restart-btn")) return;
    typing(text, words, chars);
};

const typing = (text, words, chars) => {
    text.addEventListener("keydown", function handleTyping(e) {
        if (
            (e.shiftKey && e.key === chars[index].textContent) ||
            e.key === chars[index].textContent
        ) {
            indicateTypingProgress(e, chars, "valid");
            updateAccuracy(index, "valid");
        } else if (
            e.key !== "Alt" &&
            e.key !== "Shift" &&
            e.key !== "Control" &&
            e.key !== "CapsLock" &&
            e.key !== "Backspace" &&
            e.key !== chars[index].textContent
        ) {
            showTypo(e, chars);
            indicateTypingProgress(e, chars, "typo");
            updateAccuracy(index, "typo");
        } else if (e.key === "Backspace" && index !== 0) {
            const previousCharStateIsTypo =
                chars[index - 1].classList.contains("typo");
            updateAccuracy(index - 1, previousCharStateIsTypo);
            chars[index - 1].textContent = rawText[index - 1];
            chars[index].classList.remove("current-char");
            chars[index - 1].classList.remove("typo", "valid");
            chars[index - 1].classList.add("current-char");
            chars[index - 1].parentElement.classList.add("current-word");
            chars[index - 1].parentElement.nextSibling?.classList.remove(
                "current-word"
            );
            index--;
        }

        startTimer(text, words, chars, handleTyping);

        if (index === chars.length) {
            chars[index - 1].parentElement.classList.remove("current-word");
            calculateSpeed(text, words);
            stopTimer(text, handleTyping);
        }

        moveTextByProgress(text);
        updateProgressBar(text, words);
    });
};

const setPauseBannerPosition = (pauseBanner, pauseBannerWidth, text) => {
    const currentChar = text.querySelector(".current-char");
    if (!currentChar) return (pauseBanner.style.display = "none");
    const currentCharTop = currentChar.getBoundingClientRect().top;
    const currentCharLeft = currentChar.getBoundingClientRect().left;
    const currentCharWidth = currentChar.getBoundingClientRect().width;
    const textTop = text.getBoundingClientRect().top;
    pauseBanner.style.top = `${currentCharTop - textTop - 2}px`;
    pauseBanner.style.left = `${
        currentCharLeft - pauseBannerWidth / 2 + currentCharWidth / 2
    }px`;
    pauseBanner.style.display = "flex";
};

const controlPauseBanner = (pauseBanner, text) => {
    const pauseBannerWidth = pauseBanner.getBoundingClientRect().width;
    setPauseBannerPosition(pauseBanner, pauseBannerWidth, text);

    pauseBanner.addEventListener("animationend", () => {
        pauseBanner.classList.add("pause-banner-bounce");
    });
    // Code for Chrome, Safari and Opera
    pauseBanner.addEventListener("webkitAnimationEnd", () => {
        pauseBanner.classList.add("pause-banner-bounce");
    });

    text.addEventListener("focus", () => {
        pauseBanner.style.display = "none";
    });
    text.addEventListener("blur", () => {
        setPauseBannerPosition(pauseBanner, pauseBannerWidth, text);
    });
    window.addEventListener("resize", () => {
        moveTextByProgress(text);
        if (document.activeElement.className === "text") return;
        setPauseBannerPosition(pauseBanner, pauseBannerWidth, text);
        const textWrapper = text.querySelector(".text-wrapper");
        textWrapper.addEventListener("transitionend", () => {
            if (document.activeElement.className === "text") return;
            setPauseBannerPosition(pauseBanner, pauseBannerWidth, text);
        });
    });
};

const filterTextCharacters = text => {
    rawText = text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/[\r\n ]+/g, " ")
        .slice(0, -1);

    const processedText = rawText
        .split(" ")
        .map(
            word =>
                `<span class="word">${
                    word
                        .split("")
                        .map(
                            character =>
                                `<span class="char">${character}</span>`
                        )
                        .join("") + `<span class="char"> </span>`
                }</span>`
        )
        .join("");

    return processedText;
};

const showResults = results => {
    results.forEach(result => {
        contentContainer.innerHTML += `
        <div class="text-container">
            <a href="https://en.wikipedia.org/?curid=${result.pageId}"
                target="_blank" class="text-title">
                <h2>${result.title} &#187;</h2>
            </a>
            <div tabindex="2" class="text">
              <div class="top-box"></div>
              <div class="text-wrapper">${filterTextCharacters(
                  result.text
              )}</div>
              <div class="bottom-box">
                <div class="progress-bar-container">
                  <div class="progress-bar"></div>
                </div>
              </div>
            </div>
            <div class="pause-banner">
              <span>Click and start typing</span>
            </div>
        </div>
    `;

        const text = document.querySelector(".text");
        const words = text.querySelectorAll(".word");
        const chars = text.querySelectorAll(".char");
        const pauseBanner = document.querySelector(".pause-banner");

        words[0].classList.add("current-word");
        chars[index].classList.add("current-char");

        if (words.length >= 60) {
            errorSpan.style.color = "#2b8eff73";
            showError(`This text contains ${words.length} words.`);
        } else if (words.length < 60) {
            errorSpan.style.color = "#ff597d";
            showError(
                "This text is too short. Maybe try to find another topic."
            );
        }

        controlPauseBanner(pauseBanner, text);
        text.focus();
        typing(text, words, chars);
    });
};

const gatherData = pages => {
    const results = Object.values(pages).map(page => ({
        pageId: page.pageid,
        title: page.title,
        text: page.extract,
    }));
    showResults(results);
};

const getData = async () => {
    const userInput = searchInput.value;
    if (isInputEmpty(userInput)) return;

    params.gsrsearch = userInput;
    clearPreviousResults();
    changeFormState(true);
    setLoaderState(true);

    try {
        const { data } = await axios.get(endpoint, { params });

        if (data.error) throw new Error(data.error.info);
        gatherData(data.query.pages);
    } catch (error) {
        showError(error);
    } finally {
        changeFormState(false);
        setLoaderState(false);
    }
};

const handleKeyEvent = e => {
    if (e.key === "Enter") {
        getData();
    }
};

const registerEventHandlers = () => {
    searchInput.addEventListener("keydown", handleKeyEvent);
    submitButton.addEventListener("click", getData);
    restartButton.addEventListener("click", restartTypingTest);
    refreshButton.addEventListener("click", restartTypingTest);
};

const introLoad = () => {
    searchInput.value = "touch typing";
    getData();
};

registerEventHandlers();

introLoad();
