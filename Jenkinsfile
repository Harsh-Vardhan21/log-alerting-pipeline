pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "hvardhan21/log-alerting-pipeline"
        DOCKER_TAG = "latest"
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
        sh """
            docker run --rm \
                -v /var/jenkins_home/workspace/log-alerting-pipeline:/workspace \
                -w /workspace \
                python:3.12-slim \
                sh -c 'pip install pyyaml -q && python tests/test_monitor.py'
        """
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

        stage('Deploy') {
            steps {
                echo 'Deploying container...'
                withCredentials([
                    string(credentialsId: 'gmail-app-password', variable: 'GMAIL_PASS'),
                    string(credentialsId: 'alert-email', variable: 'ALERT_MAIL')
                ]) {
                    sh "docker stop log-monitor || true"
                    sh "docker rm log-monitor || true"
                    sh """
                        docker run -d \
                            --name log-monitor \
                            --network jenkins \
                            -e ALERT_EMAIL=${ALERT_MAIL} \
                            -e ALERT_PASSWORD=${GMAIL_PASS} \
                            -e RECEIVER_EMAIL=${ALERT_MAIL} \
                            ${DOCKER_IMAGE}:${DOCKER_TAG}
                    """
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed. Check the logs above.'
        }
    }
}