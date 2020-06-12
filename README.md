This is the basic structure for a meteor App:

```css
client/main.js        # a JavaScript entry point loaded on the client
client/main.html      # an HTML file that defines view templates
client/main.css       # a CSS file to define your app's styles
server/main.js        # a JavaScript entry point loaded on the server
test/main.js          # a JavaScript entry point when running tests
package.json          
package-lock.json     
node_modules/        
.meteor/              # internal Meteor files
.gitignore            
```

You can manage the server and client code from the same tool. This is an example for a server code with 3 methods: `insert`, `remove` and `setChecked` to put some task as done.

```js
import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Tasks = new Mongo.Collection('tasks');

Meteor.methods({
    
    'tasks.insert'(text) {
        check(text, String);

        // Make sure the user is logged in before inserting a task
        if (!this.userId) {
            throw new Meteor.Error('not-authorized');
        }

        Tasks.insert({
            text,
            createdAt: new Date(),
            owner: this.userId,
            username: Meteor.users.findOne(this.userId).username,
        });
    },

    'tasks.remove'(taskId) {
        check(taskId, String);

        Tasks.remove(taskId);
    },

    'tasks.setChecked'(taskId, setChecked) {
        check(taskId, String);
        check(setChecked, Boolean);

        Tasks.update(taskId, { $set: { checked: setChecked } });
    },
});
```

### Meteor.publish and Meteor.subscribe
- `meteor remove autopublish` all new Meteor apps start with the autopublish package if users of our application want to store privacy-sensitive data this is not secure.
- We need a way of controlling which data Meteor sends to the client-side database.
- Without the autopublish package, we will have to specify explicitly what the server sends to the client

Code in the server `imports/ui/App.js`

```js
if (Meteor.isServer) {
    // This code only runs on the server
    Meteor.publish('tasks', function tasksPublication() {
        return Tasks.find({
            $or: [
                { private: { $ne: true } }, 
                { owner: this.userId }, // only send to the client task which is owner
            ],
        });
    });
}
```

Code in client component `imports/ui/Component.js`

```js
export default withTracker(() => {
  // subscribes to data from that publication
  // tasks that the user is the owner
  Meteor.subscribe('tasks');
 
  return {
    tasks: Tasks.find({}, { sort: { createdAt: -1 } }).fetch(),
    // more code...
```

### Templating Engine
- Meteor use BlazeJS as a templating engine. [BlazeJS.org](http://blazejs.org/)
- To prevent processing `.html` files as Blaze templates: `meteor remove blaze-html-templates` and `meteor add static-html`
- `blaze-html-templates` and `static-html` are Meteor packages and not npm packages
- Compilation is one of several key features that make Meteor packages more powerful than npm packages

### Keypoints in Meteor
- The entry point for both client and server JavaScript is determined by the `meteor.mainModule` section in package.json
- `imports/api` This is a sensible place to store API-related files for the application. 
- `methods` write to collections
- `publications` read from collections
- `meteor add react-meteor-data` install this meteor package to use data from a Meteor collection inside a React component
- `meteor mongo` access to the meteor mongo console

### `accounts-ui` package
- `meteor add accounts-ui accounts-password` meteor comes with an accounts system and a drop-in login user interface that lets you add multi-user functionality to your app in minutes. (Login only with Blaze). You have a lot of features included in this package. For example Facebook or Google account Login [docs accounts-ui](https://docs.meteor.com/packages/accounts-ui.html)

- In your data container, you can use Meteor.user() to check if a user is logged in and get information about them

- Example of Methods using the accounts-ui package and also adding security with methods

```js
import React, { useState } from 'react';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';

import { Tasks } from '../api/tasks.js';
import Task from './Task';

// To use the Blaze UI component from the accounts-ui package
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

// the component is subscribed or receiving data from the database - withTracker
// we can suscribe to the currentUser with Meteor.user()
export default withTracker(() => {
  Meteor.subscribe('tasks');
  return {
    tasks: Tasks.find({}, { sort: { createdAt: -1 } }).fetch(),
    incompleteCount: Tasks.find({ checked: { $ne: true } }).count(),
    currentUser: Meteor.user()
  };
})(App);
```

Configure the accounts UI to use usernames instead of email addresses in `imports/startup/accounts-config.js`

```js
import { Accounts } from 'meteor/accounts-base';

Accounts.ui.config({
  passwordSignupFields: 'USERNAME_ONLY'
});
```

### Testing in meteor
Add the dependencies:

`meteor add meteortesting:mocha`
`meteor npm install --save-dev chai`

- `tests/main.js` entry point for all your application tests
- You can split your tests across multiple modules using the convention `{filenameToTest}.test.js`

Simple test file example: 

```js
import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { assert } from 'chai';

import { Tasks } from './tasks.js';

if (Meteor.isServer) {
    describe('Tasks', () => {
        describe('methods', () => {
            const userId = Random.id();
            let taskId;
            beforeEach(() => {
                Tasks.remove({});
                taskId = Tasks.insert({
                    text: 'test task',
                    createdAt: new Date(),
                    owner: userId,
                    username: 'tmeasday',
                });
            });

            it('can delete owned task', () => {
                // Find the internal implementation of the task method so we can
                // test it in isolation
                const deleteTask = Meteor.server.method_handlers['tasks.remove'];

                // Set up a fake method invocation that looks like what the method expects
                const invocation = { userId };

                // Run the method with `this` set to the fake invocation
                deleteTask.apply(invocation, [taskId]);

                // Verify that the method does what we expected
                assert.equal(Tasks.find().count(), 0);
            });
        });
    });
}
```