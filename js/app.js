'use strict';
  var ENTER_KEY = 13;
  var newTodoDom = document.getElementById('new-todo');
  var syncDom = document.getElementById('sync-wrapper');

  //TODO este estado debe ser cambiado por una base de datos pouchdb
  //var state = [];
  var db = new PouchDB('todos');

  //TODO añadir la función db.changes(...) 
  //y una function databaseChangeEvent que obtiene todo de la base de datos y redibuja la interfaz de usuario
  db.changes({
    since: 'now',
    live: true
  }).on('change',databaseChangeEvent);

  async function databaseChangeEvent() {
    try {
      var doc = await db.allDocs({include_docs: true, descending: true});
      console.log(doc)
      var todos = doc.rows.map((row) => row.doc);
      redrawTodosUI(todos)
    } catch (error) {
      console.log(error);
    }
  }

  //TODO añadir base de datos couchdb remota y función de sincronización 
  var remoteCouch = "http://localhost:5984/todos_remote";

  //Initialise a server with remote server
  function sync() {
    syncDom.setAttribute('data-sync-state','syncing');
    var opts = {live: true};
    db.replicate.to(remoteCouch,opts,syncError);
    db.replicate.from(remoteCouch,opts,syncError);
  }

  //There was some form of error syncing 
  function syncError() {
    syncDom.setAttribute('data-sync-state', 'error');
  }


  //-------------MODIFICADORES DEL ESTADO DE LA APLICACIÓ -> create, edit, delete todo

  // Tenemos que crear un nuevo documento de tareas pendientes e introducirlo en la base de datos
  async function addTodo(text) {
    var todo = {
      _id: new Date().toISOString(),
      title: text,
      completed: false
    };
    //TODO en lugar de hacer push al array del estado, añadir la tarea a la base de datos
    //también eliminar el redrawTodosUI, porque con pouchdb la aplicación se redibuja cuando hay un cambio de base de datos
    //state.push(todo);
    //redrawTodosUI(state);
    await db.put(todo);
  }

  //edit Todo. This is not necessary because todo is passed as reference and so when we modify
  //it in the calling method it is modified in the state
  async function editTodo(todo){
    //TODO realizar una edición (put) en la base de datos
    //también eliminar el redrawTodosUI, porque con pouchdb la aplicación se redibuja cuando hay un cambio de base de datos
    //redrawTodosUI(state);
    await db.put(todo);
  }

  //El usuario ha pulsado el botón de borrado de una tarea, la borramos
  async function deleteTodo(todo) {
    //TODO realizar una eliminación en la base de datos
    //también eliminar el redrawTodosUI, porque con pouchdb la aplicación se redibuja cuando hay un cambio de base de datos
    //state = state.filter((item) => item._id !== todo._id);
    //redrawTodosUI(state);
    await db.remove(todo);
  }

  //------------- MANEJADORES DE EVENTOS

  function checkboxChanged(todo, event) {
    todo.completed = event.target.checked;
    editTodo(todo);
  }

  // El cuadro de entrada al editar una tarea se ha difuminado (blur, ha perdido el foco), 
  //así que guarde el nuevo título o borre la tarea si el título está vacío
  function todoBlurred(todo, event) {
    var trimmedText = event.target.value.trim();
    if (!trimmedText) {
      deleteTodo(todo);
    } else {
      todo.title = trimmedText;
      editTodo(todo);
    }
  }

  function newTodoKeyPressHandler( event ) {
    if (event.keyCode === ENTER_KEY) {
      addTodo(newTodoDom.value);
      newTodoDom.value = '';
    }
  }

  function deleteButtonPressed(todo){
    deleteTodo(todo);
  }

  // El usuario ha hecho doble clic en una tarea, mostramos una entrada para que pueda editar el título
  function todoDblClicked(todo) {
    var div = document.getElementById('li_' + todo._id);
    var inputEditTodo = document.getElementById('input_' + todo._id);
    div.className = 'editing';
    inputEditTodo.focus();
  }

  // Si pulsan enter mientras editan una entrada, la difuminamos (blur) para activar el guardado (o el borrado)
  function todoKeyPressed(todo, event) {
    if (event.keyCode === ENTER_KEY) {
      var inputEditTodo = document.getElementById('input_' + todo._id);
      inputEditTodo.blur();
    }
  }

  //------------- FUNCIONES DE INTERFAZ DE USUARIO

  function redrawTodosUI(todos) {
    var ul = document.getElementById('todo-list');
    ul.innerHTML = '';
    todos.forEach(function(todo) {
      ul.appendChild(createTodoListItem(todo));
    });
  }

  // Dado un objeto que representa un TODO, esto creará un elemento de la lista para mostrarlo y le añadirá los eventos necesarios
  function createTodoListItem(todo) {
    var checkbox = document.createElement('input');
    checkbox.className = 'toggle';
    checkbox.type = 'checkbox';
    checkbox.addEventListener('change', (event)=> checkboxChanged(todo, event));

    var label = document.createElement('label');
    label.appendChild( document.createTextNode(todo.title));
    label.addEventListener('dblclick', ()=>todoDblClicked(todo));

    var deleteLink = document.createElement('button');
    deleteLink.className = 'destroy';
    deleteLink.addEventListener( 'click', ()=>deleteButtonPressed(todo));

    var divDisplay = document.createElement('div');
    divDisplay.className = 'view';
    divDisplay.appendChild(checkbox);
    divDisplay.appendChild(label);
    divDisplay.appendChild(deleteLink);

    var inputEditTodo = document.createElement('input');
    inputEditTodo.id = 'input_' + todo._id;
    inputEditTodo.className = 'edit';
    inputEditTodo.value = todo.title;
    inputEditTodo.addEventListener('keypress', (event)=>todoKeyPressed(todo,event));
    inputEditTodo.addEventListener('blur', (event)=>todoBlurred(todo,event));

    var li = document.createElement('li');
    li.id = 'li_' + todo._id;
    li.appendChild(divDisplay);
    li.appendChild(inputEditTodo);

    if (todo.completed) {
      li.className += 'complete';
      checkbox.checked = true;
    }

    return li;
  }

  //función que añade los eventos iniciales
  function addEventListeners() {
    newTodoDom.addEventListener('keypress', newTodoKeyPressHandler, false);
    //TODO, añadir eventos de online y offline para sincronizar con remoto
    window.addEventListener("offline",(event) => {
      console.log('OFFLINE');
      syncError();
    });

    window.addEventListener("online", (event) => {
      console.log('ONLINE');
      sync();
    });
  }

  //-------------INICIAR TODO CUANDO EL DOM ESTÉ LISTO
  document.addEventListener('DOMContentLoaded', (event) => {
    addEventListeners();
    //TODO, cambiar por databaseChangeEvent() porque hay que sacar el estado de la base de datos, no tenemos el array state ya
    //redrawTodosUI(state);
    //TODO añadir una llamada al método sync si tenemos remotedb
    databaseChangeEvent();
    if (remoteCouch) {
      sync();

    }
    
  });
