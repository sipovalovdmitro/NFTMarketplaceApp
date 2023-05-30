#!/bin/bash
set -e
rm -f /app/tmp/pids/server.pid

bundle exec rails db:create db:migrate

bundle exec rails db:seed

npm install && bundle exec rails server -b '0.0.0.0'