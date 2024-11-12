load('ext://pulumi', 'pulumi_resource')
update_settings(k8s_upsert_timeout_secs=300)

docker_build(
  'scraper-image',
  context='.',
  dockerfile='./Dockerfile',
  # dockerfile_contents=dockerfile,
  ignore=['./node_modules', './.infra', '__tests__', './build'],
  live_update=[
    sync('./src', '/opt/app/src'),
    run(
      'npm i',
      trigger=['./package.json', './package-lock.json']
    )
  ],
  platform='linux/amd64',
)

pulumi_resource(
  'scraper',
  stack='adhoc',
  dir='.infra/',
  deps=['.infra/index.ts'],
  image_deps=['scraper-image'],
  image_configs=['image'],
)
