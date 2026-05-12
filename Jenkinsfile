pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "hvardhan21/log-alerting-pipeline"
        DOCKER_TAG = "latest"
        APP_EC2_IP = "13.232.110.33"
        APP_EC2_USER = "ec2-user"
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                checkout scm
            }
        }

        stage('Test') {
            steps {
                echo 'Running unit tests...'
                sh '''
                    pip3 install pyyaml --break-system-packages --quiet
                    python3 tests/test_monitor.py
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
            }
        }

        stage('Push to Docker Hub') {
            steps {
                echo 'Pushing image to Docker Hub...'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-credentials',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
                    sh "docker push ${DOCKER_IMAGE}:${DOCKER_TAG}"
                }
            }
        }

        stage('Deploy to App EC2') {
            steps {
                echo 'Deploying to App EC2...'
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'app-ec2-ssh',
                        keyFileVariable: 'SSH_KEY'
                    ),
                    string(credentialsId: 'gmail-app-password', variable: 'GMAIL_PASS'),
                    string(credentialsId: 'alert-email', variable: 'ALERT_MAIL')
                ]) {
                    sh """
                        ssh -i \$SSH_KEY -o StrictHostKeyChecking=no ${APP_EC2_USER}@${APP_EC2_IP} '
                            docker pull hvardhan21/log-alerting-pipeline:latest
                            docker stop log-monitor || true
                            docker stop log-generator || true
                            docker stop dashboard || true
                            docker rm log-monitor || true
                            docker rm log-generator || true
                            docker rm dashboard || true
                            docker network create app-network || true

                            docker run -d \
                                --name log-generator \
                                --network app-network \
                                -v /home/ec2-user/logs:/app/logs \
                                hvardhan21/log-alerting-pipeline:latest \
                                python -u log_generator.py

                            docker run -d \
                                --name log-monitor \
                                --network app-network \
                                -v /home/ec2-user/logs:/app/logs \
                                -e ALERT_EMAIL=${ALERT_MAIL} \
                                -e ALERT_PASSWORD=${GMAIL_PASS} \
                                -e RECEIVER_EMAIL=${ALERT_MAIL} \
                                hvardhan21/log-alerting-pipeline:latest

                            docker run -d \
                                --name dashboard \
                                --network app-network \
                                -v /home/ec2-user/logs:/logs \
                                -p 3000:3000 \
                                hvardhan21/log-alerting-pipeline-dashboard:latest
                        '
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully! Dashboard at http://13.232.110.33:3000'
        }
        failure {
            echo 'Pipeline failed. Check the logs above.'
        }
    }
}