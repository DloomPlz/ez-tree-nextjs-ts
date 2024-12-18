import React from 'react'
import dynamic from 'next/dynamic'

const DynamicTreeScene = dynamic(
  () => import('../components/TreeScene'),
  { ssr: false }
)

const TreePage: React.FC = () => {
  return (
    <div>
      <main>
        <div className="w-screen h-screen">
          <DynamicTreeScene />
        </div>
      </main>
    </div>
  )
}

export default TreePage
