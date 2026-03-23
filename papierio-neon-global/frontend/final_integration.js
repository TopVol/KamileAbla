window.finalScoreSubmit = async function(name, score){
  try {
    if (typeof submitScore === 'function') await submitScore(name, score);
    if (typeof renderLeaderboard === 'function') await renderLeaderboard();
    if (typeof loadLeaderboard === 'function') {
      const data = await loadLeaderboard();
      const top = document.getElementById('topPlayer');
      if (top) top.textContent = data && data[0] ? `${data[0].name} (${data[0].score})` : '-';
    }
  } catch (e) {
    console.warn('Leaderboard integration failed', e);
  }
};
