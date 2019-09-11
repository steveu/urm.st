import React from 'react'
import { withRouteData, Head } from 'react-static'

import { slugify } from '../helpers/global'

import AnimatedRoute from '../components/AnimatedRoute'
import Resume from '../components/Resume'
const AnimatedResume = AnimatedRoute(Resume);

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
        <meta name="description" content="Resume for Steve Urmston, UI Designer and Frontend Developer" />
      </Head>
      <AnimatedResume
        resume={resume}
        skills={skillTags}
        isPrint={true}
      />
    </div>
  )
})
