import React, { Component } from 'react';
import request from 'superagent';

class App extends Component {
  componentDidMount() {
    window.onSubmit = async (token) => {
      try {
        const response = await request.post('/api/recaptcha')
          .send(`g-recaptcha-response=${token}`);

        console.log(response);
      } catch (e) {
        console.error(e);
      }
    };
  }

  render() {
    return (
      <div>
        <button
          className="g-recaptcha"
          data-sitekey="6LdPqD4UAAAAAMv3gYa0XEeoncfJpgy3LBOcFlrU"
          data-callback="onSubmit"
        >
          Submit
        </button>
      </div>
    );
  }
}

export default App;
