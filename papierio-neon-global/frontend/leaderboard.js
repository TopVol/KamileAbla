async function submitScore(name, score){
  if(!window.LEADERBOARD_CONFIG){
    console.warn('No leaderboard config');
    return;
  }
  const { supabaseUrl, supabaseAnonKey, tableName } = window.LEADERBOARD_CONFIG;
  const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  await supabase.from(tableName).insert([{ name, score }]);
}

async function loadLeaderboard(){
  if(!window.LEADERBOARD_CONFIG){
    console.warn('No leaderboard config');
    return [];
  }
  const { supabaseUrl, supabaseAnonKey, tableName } = window.LEADERBOARD_CONFIG;
  const supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
  const { data } = await supabase.from(tableName).select('*').order('score', { ascending: false }).limit(10);
  return data;
}

async function renderLeaderboard(){
  const list = document.getElementById('leaderboard');
  if(!list)return;
  const data = await loadLeaderboard();
  list.innerHTML = data.map((e,i)=>`<div>#${i+1} ${e.name} - ${e.score}</div>`).join('');
}
