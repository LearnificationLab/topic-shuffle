document.addEventListener('DOMContentLoaded', () => {
  const views = {
    start: document.getElementById('start-view'),
    session: document.getElementById('session-view'),
    summary: document.getElementById('summary-view'),
    error: document.getElementById('error-view'),
  };

  const ui = {
    startTopic: document.getElementById('start-topic'),
    startTotal: document.getElementById('start-total'),
    startButton: document.getElementById('start-button'),
    errorMessage: document.getElementById('error-message'),
    questionText: document.getElementById('question-text'),
    translationBlock: document.getElementById('translation-block'),
    translationText: document.getElementById('translation-text'),
    tipBlock: document.getElementById('tip-block'),
    tipText: document.getElementById('tip-text'),
    translateButton: document.getElementById('translate-button'),
    tipButton: document.getElementById('tip-button'),
    skipButton: document.getElementById('skip-button'),
    answeredButton: document.getElementById('answered-button'),
    statusScore: document.getElementById('status-score'),
    statusRemaining: document.getElementById('status-remaining'),
    summaryScore: document.getElementById('summary-score'),
    summaryAnswered: document.getElementById('summary-answered'),
    summarySkipped: document.getElementById('summary-skipped'),
    summaryTips: document.getElementById('summary-tips'),
    summaryTranslations: document.getElementById('summary-translations'),
    restartButton: document.getElementById('restart-button'),
  };

  const dataState = {
    topic: null,
    questions: [],
    queue: [],
    currentIndex: null,
  };

  const sessionState = {
    score: 0,
    answeredCount: 0,
    skippedCount: 0,
    tipShown: 0,
    translationsShown: 0,
    totalAsked: 0,
    currentHintState: {
      tipViewed: false,
      translationViewed: false,
    },
  };

  ui.startButton.addEventListener('click', beginSession);
  ui.translateButton.addEventListener('click', toggleTranslation);
  ui.tipButton.addEventListener('click', toggleTip);
  ui.skipButton.addEventListener('click', handleSkip);
  ui.answeredButton.addEventListener('click', handleAnswered);
  ui.restartButton.addEventListener('click', handleRestart);

  fetchQuestions();

  function fetchQuestions() {
    setStartEnabled(false);
    setActiveView('start');

    fetch('questions.json', { cache: 'no-cache' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Request failed with status ${response.status}. Ensure questions.json is present.`
          );
        }
        return response.json();
      })
      .then((rawData) => {
        const parsed = validateQuestionData(rawData);
        dataState.topic = parsed.topic;
        dataState.questions = parsed.questions;
        dataState.queue = createShuffledQueue(parsed.questions.length);
        dataState.currentIndex = null;
        updateStartScreen();
        setStartEnabled(true);
      })
      .catch((error) => {
        console.error(error);
        showError(
          'Could not load questions.json. Place the file next to index.html using the documented schema.',
          error.message
        );
      });
  }

  function validateQuestionData(raw) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error('Root JSON value must be an object with a "questions" array.');
    }

    const { topic, questions } = raw;

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('"questions" must be a non-empty array of question objects.');
    }

    const sanitized = questions.map((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new Error(`Question at index ${index} is not a valid object.`);
      }

      const { text, translation, tip } = item;

      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error(`Question at index ${index} is missing a "text" string.`);
      }
      if (typeof translation !== 'string' || translation.trim().length === 0) {
        throw new Error(
          `Question "${text}" is missing a "translation" string.`
        );
      }
      if (typeof tip !== 'string' || tip.trim().length === 0) {
        throw new Error(`Question "${text}" is missing a "tip" string.`);
      }

      return {
        text: text.trim(),
        translation: translation.trim(),
        tip: tip.trim(),
      };
    });

    return {
      topic:
        typeof topic === 'string' && topic.trim().length > 0
          ? topic.trim()
          : 'Topic Shuffle',
      questions: sanitized,
    };
  }

  function createShuffledQueue(count) {
    const indices = Array.from({ length: count }, (_, idx) => idx); // Fisher–Yates shuffle for unbiased ordering.
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }

  function updateStartScreen() {
    ui.startTopic.textContent = dataState.topic;
    ui.startTotal.textContent = dataState.questions.length.toString();
  }

  function setStartEnabled(enabled) {
    ui.startButton.disabled = !enabled;
  }

  function setActiveView(viewName) {
    Object.entries(views).forEach(([name, element]) => {
      if (!element) {
        return;
      }
      if (name === viewName) {
        element.classList.remove('hidden');
      } else {
        element.classList.add('hidden');
      }
    });
  }

  function showError(message, detail) {
    setStartEnabled(false);
    setActiveView('error');
    ui.errorMessage.textContent = detail ? `${message} (${detail})` : message;
  }

  function beginSession() {
    if (dataState.questions.length === 0) {
      return;
    }
    resetSessionState();
    setActiveView('session');
    loadNextQuestion();
  }

  function resetSessionState() {
    sessionState.score = 0;
    sessionState.answeredCount = 0;
    sessionState.skippedCount = 0;
    sessionState.tipShown = 0;
    sessionState.translationsShown = 0;
    sessionState.totalAsked = 0;
    sessionState.currentHintState.tipViewed = false;
    sessionState.currentHintState.translationViewed = false;

    if (dataState.questions.length > 0) {
      dataState.queue = createShuffledQueue(dataState.questions.length);
    } else {
      dataState.queue = [];
    }
    dataState.currentIndex = null;
  }

  function loadNextQuestion() {
    const nextIndex = getNextQuestionIndex();
    if (nextIndex == null) {
      finishSession();
      return;
    }

    const question = dataState.questions[nextIndex];
    renderQuestion(question);
    updateStatus();
  }

  function renderQuestion(question) {
    ui.questionText.textContent = question.text;
    ui.translationText.textContent = question.translation;
    ui.tipText.textContent = question.tip;

    setHintVisibility(
      ui.translationBlock,
      ui.translateButton,
      false,
      'Hide translation',
      'Translate'
    );
    setHintVisibility(
      ui.tipBlock,
      ui.tipButton,
      false,
      'Hide tip',
      'Tip'
    );
  }

  function setHintVisibility(block, button, visible, activeLabel, inactiveLabel) {
    if (!block || !button) {
      return;
    }
    if (visible) {
      block.classList.remove('hidden');
    } else {
      block.classList.add('hidden');
    }
    button.setAttribute('aria-pressed', visible ? 'true' : 'false');
    button.textContent = visible ? activeLabel : inactiveLabel;
  }

  function updateStatus() {
    ui.statusScore.textContent = `Score: ${sessionState.score}`;
    const remaining = Math.max(
      dataState.questions.length - sessionState.totalAsked,
      0
    );
    ui.statusRemaining.textContent = `Remaining: ${remaining}`;
  }

  function toggleTranslation() {
    if (dataState.currentIndex == null) {
      return;
    }
    const willShow = ui.translationBlock.classList.contains('hidden');

    setHintVisibility(
      ui.translationBlock,
      ui.translateButton,
      willShow,
      'Hide translation',
      'Translate'
    );

    if (willShow && !sessionState.currentHintState.translationViewed) {
      sessionState.currentHintState.translationViewed = true;
      sessionState.translationsShown += 1;
    }
  }

  function toggleTip() {
    if (dataState.currentIndex == null) {
      return;
    }
    const willShow = ui.tipBlock.classList.contains('hidden');

    setHintVisibility(
      ui.tipBlock,
      ui.tipButton,
      willShow,
      'Hide tip',
      'Tip'
    );

    if (willShow && !sessionState.currentHintState.tipViewed) {
      sessionState.currentHintState.tipViewed = true;
      sessionState.tipShown += 1;
    }
  }

  function handleSkip() {
    if (dataState.currentIndex == null) {
      return;
    }
    sessionState.skippedCount += 1;
    loadNextQuestion();
  }

  function handleAnswered() {
    if (dataState.currentIndex == null) {
      return;
    }

    const basePoints = 2;
    const noTipBonus = sessionState.currentHintState.tipViewed ? 0 : 2;
    const noTranslationBonus = sessionState.currentHintState.translationViewed ? 0 : 1;

    sessionState.score += basePoints + noTipBonus + noTranslationBonus;
    sessionState.answeredCount += 1;

    loadNextQuestion();
  }

  function finishSession() {
    updateSummaryView();
    setActiveView('summary');
  }

  function updateSummaryView() {
    ui.summaryScore.textContent = sessionState.score.toString();
    ui.summaryAnswered.textContent = sessionState.answeredCount.toString();
    ui.summarySkipped.textContent = sessionState.skippedCount.toString();
    ui.summaryTips.textContent = sessionState.tipShown.toString();
    ui.summaryTranslations.textContent = sessionState.translationsShown.toString();
  }

  function handleRestart() {
    setActiveView('start');
    setStartEnabled(true);
    updateStartScreen();
    ui.startButton.focus();
  }

  function getNextQuestionIndex() {
    if (sessionState.totalAsked >= dataState.questions.length) {
      return null;
    }

    const nextPosition = sessionState.totalAsked;
    const nextIndex = dataState.queue[nextPosition];
    dataState.currentIndex = nextIndex;
    sessionState.totalAsked += 1;
    sessionState.currentHintState.tipViewed = false;
    sessionState.currentHintState.translationViewed = false;
    return nextIndex;
  }
});
