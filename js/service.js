import { openDB } from 'idb';
const generateUUID = () => new Date().getTime().toString(16);

class IdbService {
  db = null;

  async initDb() {
    this.db = await openDB('todolist', 1, {
      upgrade(db) {
        // Create a store of objects
        db.createObjectStore('todos', {
        // The 'id' property of the object will be the key.
        keyPath: 'id',
        });
      }
    });
  }

  async setTodos(todos) {
    if(!this.db) { await this.initDb() }
    const tx = this.db.transaction('todos', 'readwrite');
    tx.store.clear();
    for (const todo of todos) {
      tx.store.put(todo)
    }
    await tx.done;
  }

  async getTodos() {
    if(!this.db) { await this.initDb() }
    return await this.db.getAll('todos')
  }

  async addOrUpdateTodo(todo) {
    if(!this.db) { await this.initDb() }
    const tx = this.db.transaction('todos', 'readwrite');
    tx.store.put(todo)
    await tx.done;
  }

  async deleteTodo(id) {
    if(!this.db) { await this.initDb() }
    console.log(await this.db.get('todos', id))
    await this.db.delete('todos', id)
  }
}

class TodoListService {
    idbService = null;
    constructor() {
      this.idbService = new IdbService();
      // When user is back online, we sync local changes with server
      window.addEventListener('online', async (e) => {
        await this.syncList();
      })
    }
    async getTodos() {
      if (navigator.onLine) {
        const todos =  await fetch('http://localhost:3000/todos').then(res => res.json());
        this.idbService.setTodos(todos)
        return todos;
      }
      return this.idbService.getTodos();
    }
  
    async addTodo(content) {
      const todo = {
        id: generateUUID(),
        content,
        done: false,
        isSync: false
      }
      if (navigator.onLine) {
        todo.isSync = true;
        const addedTodo = await fetch('http://localhost:3000/todos', {
          method: 'post',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(todo)
        }).then(res => res.json());
        await this.idbService.addOrUpdateTodo(todo);
        return addedTodo;
      }
      await this.idbService.addOrUpdateTodo(todo);
      return todo;
    }
  
    async changeDoneState(todo, state = true) {
      todo.done = state;
      if (navigator.onLine) {
        todo.isSync = true;
        await fetch(`http://localhost:3000/todos/${todo.id}`, {
          method: 'put',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(todo)
        }).then(res => res.json());
        await this.idbService.addOrUpdateTodo(todo)
        return;
      }
      todo.isSync = false;
      await this.idbService.addOrUpdateTodo(todo)
    }
  
    async removeTodo(id) {
      if(navigator.onLine) {
        await fetch(`http://localhost:3000/todos/${id}`, {method: 'delete'});
        await this.idbService.deleteTodo(id);
        return;
      }
      await this.idbService.deleteTodo(id);
    }
  
    // Sync indexedDb todos with server's
    async syncList() {
      const dbTodos =  await fetch('http://localhost:3000/todos').then(res => res.json());
      const localTodos = await this.idbService.getTodos();
      const unsyncTodos = localTodos.filter(todo => todo.isSync === false);
      const deletedTodos = dbTodos.filter(todo => !dbTodos.map(e => e.id).includes(todo.id));
  
      for (const elem of unsyncTodos) {
        await this.changeDoneState(elem, elem.done);
      }
      for (const elem of deletedTodos) {
        await this.removeTodo(elem.id);
      }
      return;
    }
  }
  
  export default new TodoListService();