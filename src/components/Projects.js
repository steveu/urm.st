import React, { PureComponent } from 'react'
import { Link } from 'react-static'

// Components
import Project from './Project'

class Projects extends PureComponent {

  render () {
    const { projects } = this.props
    return (
      <div>
        {projects.map(project => (
          <Project project={project} />
        ))}
      </div>
    )
  }
}

export default Projects