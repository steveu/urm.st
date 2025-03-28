import React, { Component } from 'react'

class WindowChrome extends Component {
  shouldComponentUpdate() {
    return false;
  }
  render () {
    const { image, imageAlt, frame_class } = this.props
    return (
      <div className={`window ${frame_class}`}>
        <div className="window__chrome">
          <div className="window__buttons">
            <span className="window__dot is-red"></span>
            <span className="window__dot is-yellow"></span>
            <span className="window__dot is-green"></span>
          </div>
        </div>
        <div className="window__contents">
          <img src={image} alt={`Screenshot of ${imageAlt}`} />
        </div>
      </div>
    )
  }
}

export default WindowChrome