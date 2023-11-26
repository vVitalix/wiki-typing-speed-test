const loader = document.querySelector(".loader");
const textWrapper = document.querySelector(".text-wrapper");
const text = document.querySelector(".text-wrapper__text");
const title = document.querySelector(".text-title__title");
const pauseBanner = document.querySelector(".pause-banner");
const progressBar = document.querySelector(".progress-bar__bar");
const wordCount = document.querySelector(".word-count__num");
const searchInput = document.querySelector(".search-form__input");
const submitButton = document.querySelector(".search-form__submit-btn");
const restartButton = document.querySelector(".controls__restart-btn");
const resultsModal = document.querySelector(".results-modal");
const tryAgainButton = document.querySelector(".results-modal__try-again-btn");
const speed = document.querySelector("#speed");
const accuracy = document.querySelector("#accuracy");
const speedResult = document.querySelector("#speed-result");
const accuracyResult = document.querySelector("#accuracy-result");
const timer = document.querySelector("#timer");
const timerIcon = document.querySelector(".stats__timer-icon");
const timerIconColor = document.querySelector(".color-start");

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

let rawText;
let index;
let typos;
let timerLoop;
let remainingTime;
let secondsTestDuration = 60;

const resetStats = () => {
    speed.textContent = "...";
    accuracy.textContent = "...%";
    speedResult.textContent = speed.textContent;
    accuracyResult.textContent = accuracy.textContent;
    timer.textContent = secondsTestDuration.toString().padStart(2, "0");
    timerIcon.style.strokeDashoffset = 0;
    index = 0;
    typos = 0;
    timerLoop = null;
    remainingTime = null;
    timerIconColor.classList.remove("expire");
};

const clearPreviousSearchResults = () => {
    searchInput.value = "";
    title.innerHTML = "";
    text.innerHTML = "";
    wordCount.innerHTML = "";
    rawText = "";
    resetStats();
};

const isInputEmpty = input => {
    if (!input || input === "") return true;
    return false;
};

const showError = error => {
    console.log(error);
};

const setLoaderState = isLoading => {
    loader.style.display = isLoading ? "flex" : "none";
    textWrapper.style.display = isLoading ? "none" : "block";

    changeFormState(isLoading);
    changeRestartButtonState(isLoading);
    handlePauseBanner();
};

const changeFormState = isDisabled => {
    searchInput.disabled = isDisabled;
    submitButton.disabled = isDisabled;
};

const changeRestartButtonState = isDisabled => {
    restartButton.disabled = isDisabled;
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
    if (charState === "typo") typos++;
    //Checking the state of the previous character if it's a typo when "Backspace" is pressed
    if (charState === true) typos--;

    accuracy.textContent =
        numberOfTypedChars > 0
            ? `${Math.floor(100 - 100 * (typos / numberOfTypedChars))}%`
            : "...%";
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

const moveTextByProgress = () => {
    const currentWord = text.querySelector(".current-word");
    if (!currentWord) return;
    const currentWordHeight = currentWord.getBoundingClientRect().height;
    const currentWordMarginBottom = parseInt(
        getComputedStyle(currentWord).getPropertyValue("margin-bottom")
    );
    const currentWordPosition = currentWord.offsetTop;

    text.style.top =
        (currentWordHeight + currentWordMarginBottom) * 2 < currentWordPosition
            ? `${
                  (currentWordHeight + currentWordMarginBottom) * 2 -
                  currentWordPosition
              }px`
            : "0px";

    handlePauseBanner();
};

const updateProgressBar = () => {
    const words = text.querySelectorAll(".word");
    const currentWord = text.querySelector(".current-word");
    const indexOfCurrentWord = [].indexOf.call(words, currentWord);

    progressBar.style.width =
        indexOfCurrentWord !== -1
            ? `${Math.floor((indexOfCurrentWord / words.length) * 100)}%`
            : "100%";
};

const calculateSpeed = () => {
    const words = text.querySelectorAll(".word");
    const currentWord = text.querySelector(".current-word");
    const indexOfCurrentWord = [].indexOf.call(words, currentWord);

    const wordsTyped =
        indexOfCurrentWord !== -1 ? indexOfCurrentWord : words.length;

    // Calculating typing speed in wpm (words per minute), 1 min = 60000 ms
    speed.textContent =
        wordsTyped > 0
            ? Math.floor(
                  (60000 * wordsTyped) /
                      (secondsTestDuration * 1000 - remainingTime)
              )
            : 0;
};

const limiter = (fn, wait) => {
    let isCalled = false;

    return function () {
        if (!isCalled) {
            fn();
            isCalled = true;

            setTimeout(() => {
                isCalled = false;
            }, wait);
        }
    };
};

const calculateSpeedLimited = limiter(calculateSpeed, 2250);

const startTimer = () => {
    if (index === 0 || timerLoop !== null) return;

    changeFormState(true);
    timerIcon.classList.remove("easing");

    const setTime = secondsTestDuration * 1000;
    const startTime = Date.now();
    const futureTime = startTime + setTime;

    timerLoop = setInterval(countDown);

    function countDown() {
        const currentTime = Date.now();
        remainingTime = futureTime - currentTime;

        if (remainingTime < 0) {
            remainingTime = 0;
            timer.textContent = "00";
            timerIcon.style.strokeDashoffset = 245;

            stopTimer();
            return;
        }

        if (remainingTime <= 6000) {
            timerIconColor.classList.add("expire");
        }

        const secondsLeft = Math.floor((remainingTime / 1000) % 60);
        timer.textContent = secondsLeft.toString().padStart(2, "0");
        timerIcon.style.strokeDashoffset =
            245 - 245 * (remainingTime / setTime);

        calculateSpeedLimited();
    }
};

const stopTimer = () => {
    textWrapper.blur();
    textWrapper.removeEventListener("keydown", handleTyping);
    clearInterval(timerLoop);
    handlePauseBanner();
    calculateSpeed();
    showTestResults();
};

const showTestResults = () => {
    speedResult.textContent = speed.textContent;
    accuracyResult.textContent = accuracy.textContent;
    resultsModal.classList.add("show");
};

const restartTypingTest = () => {
    clearInterval(timerLoop);
    timerIcon.classList.add("easing");
    resetStats();
    changeFormState(false);
    resultsModal.classList.remove("show");

    const words = text.querySelectorAll(".word");
    const chars = text.querySelectorAll(".char");

    words.forEach(word => {
        word.classList.remove("current-word");
    });
    chars.forEach(char => {
        char.classList.remove("typo", "valid", "current-char");
    });

    words[0].classList.add("current-word");
    chars[index].classList.add("current-char");

    moveTextByProgress();
    updateProgressBar();
    textWrapper.addEventListener("keydown", handleTyping);
    textWrapper.focus();
};

const handleTyping = e => {
    const chars = text.querySelectorAll(".char");

    if (
        (e.shiftKey && e.key === chars[index].textContent) ||
        e.key === chars[index].textContent
    ) {
        indicateTypingProgress(e, chars, "valid");
        updateAccuracy(index, "valid");
    } else if (
        e.key !== "Alt" &&
        e.key !== "Tab" &&
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

    startTimer();

    if (index === chars.length) {
        chars[index - 1].parentElement.classList.remove("current-word");

        stopTimer();
    }

    moveTextByProgress();
    updateProgressBar();
};

const handlePauseBanner = () => {
    const currentChar = text.querySelector(".current-char");

    if (
        !currentChar ||
        document.activeElement.className === "text-wrapper" ||
        remainingTime === 0
    ) {
        pauseBanner.style.display = "none";
        pauseBanner.classList.remove("bounce");
        return;
    }

    const currentCharTop = currentChar.getBoundingClientRect().top;
    const currentCharLeft = currentChar.getBoundingClientRect().left;
    const currentCharWidth = currentChar.getBoundingClientRect().width;
    const pauseBannerWidth = parseInt(
        getComputedStyle(pauseBanner).getPropertyValue("width")
    );
    const pauseBannerHeight = parseInt(
        getComputedStyle(pauseBanner).getPropertyValue("height")
    );

    if (currentCharLeft > 60) {
        pauseBanner.style.left = `${
            currentCharLeft + currentCharWidth / 2 - pauseBannerWidth / 2
        }px`;
        pauseBanner.classList.remove("offset");
    } else {
        pauseBanner.style.left = `${currentCharLeft + currentCharWidth / 2}px`;
        pauseBanner.classList.add("offset");
    }

    pauseBanner.style.top = `${currentCharTop - pauseBannerHeight - 10}px`;
    pauseBanner.style.display = "flex";
};

const bouncePauseBanner = () => {
    pauseBanner.classList.add("bounce");
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
        .map((word, i, arr) => {
            if (i === arr.length - 1)
                return `<span class="word">${word
                    .split("")
                    .map(character => `<span class="char">${character}</span>`)
                    .join("")}</span>`;

            return `<span class="word">${
                word
                    .split("")
                    .map(character => `<span class="char">${character}</span>`)
                    .join("") + `<span class="char">${" "}</span>`
            }</span>`;
        })
        .join("");

    return processedText;
};

const formatTitle = title => {
    const titleString =
        title.length > 20 ? `${title.substring(0, 20)}...` : title;
    return titleString;
};

const showSearchResults = results => {
    results.forEach(result => {
        title.innerHTML = ` <a 
                                target="_blank" 
                                rel="noopener noreferrer"
                                aria-label="Learn more on the Wikipedia page" 
                                href="https://en.wikipedia.org/?curid=${
                                    result.pageId
                                }"
                                title="${result.title}"
                            >
                                ${formatTitle(result.title)}
                            </a>
                                `;
        text.innerHTML = `${filterTextCharacters(result.text)}`;

        const words = text.querySelectorAll(".word");
        const chars = text.querySelectorAll(".char");

        words[0].classList.add("current-word");
        chars[index].classList.add("current-char");
        wordCount.innerHTML = words.length;
    });
};

const gatherData = pages => {
    const results = Object.values(pages).map(page => ({
        pageId: page.pageid,
        title: page.title,
        text: page.extract,
    }));
    showSearchResults(results);
};

const getData = async () => {
    const userInput = searchInput.value.trim();
    if (isInputEmpty(userInput)) return;

    params.gsrsearch = userInput;
    clearPreviousSearchResults();
    setLoaderState(true);

    try {
        const { data } = await axios.get(endpoint, { params });

        if (data.error) throw new Error(data.error.info);
        gatherData(data.query.pages);
    } catch (error) {
        showError(error);
    } finally {
        setLoaderState(false);
        searchInput.focus();
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
    textWrapper.addEventListener("keydown", handleTyping);
    textWrapper.addEventListener("focus", handlePauseBanner);
    textWrapper.addEventListener("blur", handlePauseBanner);
    textWrapper.addEventListener("transitionend", moveTextByProgress);
    text.addEventListener("transitionend", handlePauseBanner);
    window.addEventListener("resize", moveTextByProgress);
    pauseBanner.addEventListener("animationend", bouncePauseBanner);
    restartButton.addEventListener("click", restartTypingTest);
    tryAgainButton.addEventListener("click", restartTypingTest);
};

const introLoad = () => {
    searchInput.value = "touch typing";
    getData();
};

registerEventHandlers();

introLoad();

/* THEME TOGGLE */

const darkButton = document.getElementById("dark");
const lightButton = document.getElementById("light");

const setDarkTheme = () => {
    document.querySelector("body").classList = "dark-theme";
    localStorage.setItem("theme", "dark");
};

const setLightTheme = () => {
    document.querySelector("body").classList = "light-theme";
    localStorage.setItem("theme", "light");
};

const themeFromLocalStorage = () => {
    return localStorage.getItem("theme");
};

const themeFromPreferences = () => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"; // If preference is set or does not match anything (light is default)
};

const loadAndUpdateTheme = () => {
    // local storage has precendence over the prefers-color-scheme
    const theme = themeFromLocalStorage() || themeFromPreferences();
    theme == "dark" ? darkButton.click() : lightButton.click();
};

// when the inputs are clicked, check which radio button is checked and change the theme
const radioButtons = document.querySelectorAll(".theme-toggle__wrapper input");
radioButtons.forEach(button => {
    button.addEventListener("click", e => {
        darkButton.checked ? setDarkTheme() : setLightTheme();
    });
});

// when the prefers-color-scheme changes, this event will be emitted
// event reflects the media query, if it matches, the new theme is dark, else it is light
window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", e => {
        e.matches ? darkButton.click() : lightButton.click();
    });

// Load the right theme on startup - localStorage has precedence
loadAndUpdateTheme();
