import page from 'page';
import Service from './service';

const outlet = document.getElementById('root');
page('/', async () => {

  const list = await displayList();
  outlet.appendChild(list);
});

async function displayList() {
    const element = document.createElement('div');
    element.innerHTML = `
        <div>
            <h1>TODO</h1>
        </div>
        <ul id="element"></ul>
        <form name="addTodo" id="addTodo">
            <label for="todoContent">New Todo</label>
            <div>
            <input type="text" id="todoContent" name="todoContent">
            <button>Add</button>
            </div>
        </form>
    `;

    const form = element.querySelector("#addTodo");
    const todoName = form.querySelector("#todoContent");
    const elementDisplay = element.querySelector("#element");

    refreshTodos(elementDisplay);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        addTodo(todoName, elementDisplay);
    })

    return element;
}

function addTodo(input, outlet){

    const value = input.value;

    if(todoContent === '') return;

    Service.addTodo(value).then(
        async (newTodo) => {
        if(newTodo) {
            input.value = '';
            await refreshTodos(outlet);
        }
    });
}

function displayTodos(outlet, todos) {
    outlet.innerHTML = '';

    for(const element of todos) {
      const todoElement = TodoElement(outlet, element);
      todoElement.addEventListener('remove', async (e) => await refreshTodos(outlet))
    }
}

async function refreshTodos(outlet) {
    const todos = await Service.getTodos();
    displayTodos(outlet, todos);
}

function TodoElement(outlet, data) {
    const constructor = document.createElement('li');
    constructor.innerHTML = `
        <div>${data.content}</div>
        <input type="checkbox" ${data.done ? 'checked' : ''}>
        <label for="done-${data.id}">Done</label>
        <div>
            <button name="deleteElement"> 
                x 
            </button>
        </div>`
    const checkbox = constructor.querySelector('input[type=checkbox]');
    checkbox.addEventListener('change', async(e) => {
      const state = e.target.checked;
      await Service.changeDoneState(data, state)
    })
  
    const deleteButton = constructor.querySelector('button[name=deleteElement]');
    deleteButton.addEventListener('click', async (e) => {
      await Service.removeTodo(data.id)
      const removeEvent = new CustomEvent('remove');
      constructor.dispatchEvent(removeEvent);
    })
    outlet.appendChild(constructor);
    return constructor;
}  

page();