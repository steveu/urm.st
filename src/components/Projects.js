import React, { PureComponent } from 'react'
import { Link } from 'react-static'

// Components
import Project from './Project'

class Projects extends PureComponent {

  render () {
    let { projects, isFeatured } = this.props

    if (isFeatured) {
      console.log('feature');
      projects = projects.filter(function(project) { return project.feature; })
    }

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