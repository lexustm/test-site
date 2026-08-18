const button = document.getElementById('demoButton');
const message = document.getElementById('message');

button.addEventListener('click', () => {
  message.textContent = 'JavaScript сработал: теперь мы можем менять поведение сайта отдельным файлом.';
  button.textContent = 'Готово ✓';
});
