import React, { Component } from 'react';

export default function(ComposedComponent) {
  class AnimatedRoute extends Component {
    constructor(props) {
      super(props)
      this.mountStyle = this.mountStyle.bind(this)
      this.state = {
        show: false
      }
    }

    mountStyle() {
      this.setState({
        show: true
      })
    }

    componentDidMount() {
      setTimeout(this.mountStyle, 10)
    }

    render() {
      return (
        <div className={`animated animated-route ${this.state.show && 'animated-route-in'}`}>
          <ComposedComponent {...this.props} />
        </div>
      )
    }
  }

  return AnimatedRoute;
}
