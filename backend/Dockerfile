FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /build

COPY pom.xml .
COPY src ./src

RUN --mount=type=cache,target=/root/.m2 mvn -B clean package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app

RUN useradd --system --create-home --shell /usr/sbin/nologin spring
USER spring

COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
