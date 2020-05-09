import { openDB } from 'idb';

function create_UUID(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (dt + Math.random()*16)%16 | 0;
        dt = Math.floor(dt/16);
        return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
}

const BASE_URL = 'http://localhost:3000/todos/'

const BASE_CONTENT_TYPE = {'Content-Type': 'application/json'}

class IdbService {
  db = null;

  async initDb() {
    this.db = await openDB('list', 1, {
      upgrade(db) {
        db.createObjectStore('todos', {keyPath: 'id'});
      }
    });
  }

  async refresh(todos) {
    const tx = this.db.transaction('todos', 'readwrite');
    tx.store.clear();
    for (const todo of todos) {
      tx.store.put(todo)
    }
    await tx.done;
  }

  async getTodos() {
    return this.db.getAll('todos')
  }

  async insertTodo(todo) {
    const tx = this.db.transaction('todos', 'readwrite');
    tx.store.put(todo)
    await tx.done;
  }

  async deleteTodo(id) {
    await this.db.delete('todos', id)
  }
}

class OfflineManager  {

    idbService = null;
    todoListService = null;


    constructor() {
        this.idbService = new IdbService();
        this.todoListService = new TodoListService();
        this.idbService.initDb();
  
        window.addEventListener('online', async (e) => {
            await this.syncList();
        })

        const intodo = async () => {

            console.log(await this.idbService.getTodos())
        }

        // intodo();
    }

    async refreshMemoryDb(todo) {
        this.idbService.refresh(todo)
    }
  
    async getTodos() {
        if (navigator.onLine) return this.todoListService.select();

        return this.idbService.getTodos();
    }
    
    async addTodo(content) {
        const todo = {
          id: create_UUID(),
          content,
          done: false,
          isSync: false
        }
        if (navigator.onLine) await this.todoListService.insert(todo)

        await this.idbService.insertTodo(todo);

        return todo;
    }
    
    async updateState(todo, state = true) {
        todo.done = state;
        if (navigator.onLine) {
            this.todoListService.updateState(todo, state)
          await this.idbService.insertTodo(todo)
          return;
        }
        todo.isSync = false;
        await this.idbService.insertTodo(todo)
    }
    
    async removeTodo(id) {
        if(navigator.onLine) {
            await this.todoListService.remove(id);
            await this.idbService.deleteTodo(id);
            return;
        }
        await this.idbService.deleteTodo(id);
    }
      
    async syncList() {
    const dbTodos =  await fetch(BASE_URL).then(res => res.json());
    const localTodos = await this.idbService.getTodos();

    console.log(localTodos);
    
    localTodos
        .filter(todo => todo.isSync === false)
        .forEach(async element => {
            console.log(element);
            await this.updateState(element, element.done);
        });        
    

        
    dbTodos
        .filter(todo => !dbTodos.map(e => e.id).includes(todo.id))
        .forEach(async element => {
            console.log(element);
            await this.removeTodo(element.id);
        });
    }
}


class TodoListService {

    async select() {
        const todos =  await fetch(BASE_URL).then(res => res.json());
        return todos;
    }
  
    async insert(todo) {

        todo.isSync = true;
        const addedTodo = await fetch(BASE_URL, {
          method: 'post',
          headers: BASE_CONTENT_TYPE,
          body: JSON.stringify(todo)
        }).then(res => res.json());

        return addedTodo;
    }
  
    async updateState(todo, state) {
        todo.done = state;
        todo.isSync = true;
        await fetch(`${BASE_URL}${todo.id}`, {
            method: 'put',
            headers: BASE_CONTENT_TYPE,
            body: JSON.stringify(todo)
        }).then(res => res.json());
    }
  
    async remove(id) {
        await fetch(`${BASE_URL}${id}`, {method: 'delete'});
    }
  }
  
  export default new OfflineManager();