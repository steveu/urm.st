import React from 'react'
import { withRouteData, Head } from 'react-static'

// Helpers
import { slugify } from '../helpers/global'

// Components
import Resume from '../components/Resume'

export default withRouteData(({ resume }) => {

  let skillTags = [];
  for (var i = 0; i < resume.skills.length; i++) {
    for (var t = 0; t < resume.skills[i].keywords.length; t++) {
      skillTags.push({
        name: resume.skills[i].keywords[t],
        category: slugify(resume.skills[i].name)
      });
    }
  }

  return (
    <div>
      <Head>
        <title>Steve Urmston | Resume</title>
      </Head>
      <Resume
        resume={resume}
        skills={skillTags}
      />
    </div>
  )
})
