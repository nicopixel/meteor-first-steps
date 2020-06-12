import React, { useState } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';

import { Tasks } from '../api/tasks.js';
import Task from './Task';
import AccountsUIWrapper from './AccountsUIWrapper';

// App component - represents the whole app
const App = ({ incompleteCount, tasks, currentUser }) => {
  const [text, setText] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);

  const renderTasks = () => {
    const currentUserId = currentUser && currentUser._id;
    return tasks.filter(task => hideCompleted ? !task.checked : true).map((task) => (
      <Task showPrivateButton={task.owner === currentUserId} key={task._id} task={task} />
    ));
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    Meteor.call('tasks.insert', text);
  }

  return <>
    <div className="container">
      <header>
        <h1>Todo List ({incompleteCount})</h1>

        <label className="hide-completed">
          <input
            type="checkbox"
            readOnly
            checked={hideCompleted}
            onClick={() => setHideCompleted((prev) => !prev)}
          />
            Hide Completed Tasks
          </label>

        <AccountsUIWrapper />

        {currentUser && <form className="new-task" onSubmit={handleSubmit} >
          <input
            placeholder="Type to add new tasks"
            onChange={e => setText(e.target.value)}
          />
        </form>}
      </header>

      <ul>
        {renderTasks()}
      </ul>
    </div>
  </>
}

export default withTracker(() => {
  Meteor.subscribe('tasks');
  return {
    tasks: Tasks.find({}, { sort: { createdAt: -1 } }).fetch(),
    incompleteCount: Tasks.find({ checked: { $ne: true } }).count(),
    currentUser: Meteor.user()
  };
})(App);