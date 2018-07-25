# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure('2') do |config|
  config.vm.box = 'debian/stretch64'
  config.vm.network 'forwarded_port',
                    guest: 6379,
                    host: 6379,
                    auto_correct: true
  config.vm.synced_folder '.', '/vagrant', disabled: true
  config.vm.provision 'shell', inline: <<-SHELL.gsub(/^ +/, '')
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get -y install build-essential

    adduser --system --home /var/lib/redis --quiet --group redis
    for DIR in /var/lib/redis /var/log/redis /var/run/redis
    do
      mkdir -p ${DIR}
      chown -R redis:redis ${DIR}
      chmod 750 ${DIR}
    done
    mkdir -p /etc/redis

    wget -q https://github.com/antirez/redis/archive/5.0-rc3.tar.gz
    tar xzvf 5.0-rc3.tar.gz
    cd redis-5.0-rc3
    make && make install

    cat << EOF > /etc/systemd/system/redis.service
      [Unit]
      Description=Redis Datastore Server
      After=network.target

      [Service]
      Type=forking
      PIDFile=/var/run/redis/redis.pid
      User=redis
      Group=redis

      RuntimeDirectory=redis
      RuntimeDirectoryMode=0700

      ExecStart=/usr/local/bin/redis-server /etc/redis/redis.conf
      ExecReload=/bin/kill -USR2 $MAINPID
      ExecStop=/usr/local/bin/redis-cli shutdown
      Restart=always

      [Install]
      WantedBy=multi-user.target
    EOF

    cat << EOF > /etc/redis/redis.conf
      bind 0.0.0.0
      port 6379
      timeout 0
      tcp-keepalive 300
      daemonize yes
      supervised systemd
      pidfile /var/run/redis/redis.pid
      loglevel verbose
      logfile /var/log/redis/redis.log
      dir /var/lib/redis
    EOF

    systemctl daemon-reload
    systemctl enable redis
    systemctl restart redis
  SHELL
end
